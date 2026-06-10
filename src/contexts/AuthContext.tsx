import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/types";
import { bootStore, teardownStore } from "@/lib/localdb";

interface AuthCtx {
  profile: Profile | null;
  userId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  profile: null,
  userId: null,
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
});

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch(() => {
      clearTimeout(t);
      resolve(null);
    });
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Restore session from localStorage immediately (sync read), end loading,
   * then best-effort fetch the profile in the background with a hard timeout.
   */
  const loadProfile = async () => {
    let uid: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      uid = data.session?.user?.id ?? null;
    } catch {
      uid = null;
    }

    setUserId(uid);

    if (!uid) {
      setProfile(null);
      setLoading(false);
      await teardownStore();
      return;
    }

    // End loading immediately — UI can render even before profile arrives.
    setLoading(false);

    const result = await withTimeout(
      Promise.resolve(
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      ),
      8000,
    );

    if (!result) {
      // Network blip — keep whatever profile we already have; the local
      // store is still usable from cached IDB data.
      return;
    }

    const { data, error } = result as { data: Profile | null; error: unknown };
    if (error) {
      console.warn("[auth] profile fetch failed:", error);
      return;
    }
    if (data) {
      setProfile(data);
      // Boot the local store (no-op if already booted for same user).
      void bootStore(data.username);
    }
  };

  useEffect(() => {
    void loadProfile();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // Narrow filter: ignore USER_UPDATED / TOKEN_REFRESHED / INITIAL_SESSION
      // which fire on every focus and silent token refresh, causing redundant
      // profile fetches.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        void loadProfile();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        profile,
        userId,
        loading,
        refresh: loadProfile,
        signOut: async () => {
          await teardownStore();
          await supabase.auth.signOut();
          setProfile(null);
          setUserId(null);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
