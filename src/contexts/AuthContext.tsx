import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/types";

interface AuthCtx {
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  profile: null,
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
});

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch(() => { clearTimeout(t); resolve(null); });
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Two-phase loader:
  //  1. Read the session synchronously from local storage; end the global
  //     loading state immediately so the UI never hangs on flaky mobile networks.
  //  2. Best-effort profile fetch in the background, with a timeout.
  const loadProfile = async () => {
    let userId: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user?.id ?? null;
    } catch {
      userId = null;
    }

    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // End loading immediately so route guards can run.
    setLoading(false);

    const result = await withTimeout(
      Promise.resolve(
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
      ),
      6000,
    );

    if (!result) {
      // Timed out or transient error — recover by clearing the bad session
      // so the login screen appears instead of hanging forever.
      console.warn("[auth] profile fetch timed out; signing out");
      try { await supabase.auth.signOut(); } catch {}
      setProfile(null);
      return;
    }

    const { data, error } = result as { data: Profile | null; error: unknown };
    if (error) {
      console.warn("[auth] profile fetch failed:", error);
      setProfile(null);
      return;
    }
    setProfile(data ?? null);
  };

  useEffect(() => {
    loadProfile();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        loadProfile();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        profile,
        loading,
        refresh: loadProfile,
        signOut: async () => {
          await supabase.auth.signOut();
          setProfile(null);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
