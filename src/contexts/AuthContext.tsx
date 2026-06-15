import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/types";
import { saveFCMToken } from "@/lib/firebase";
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

const PROFILE_CACHE_KEY = "tt:profile";

function readCachedProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}
function writeCachedProfile(p: Profile | null) {
  if (typeof window === "undefined") return;
  try {
    if (p) window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p));
    else window.localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Restore profile from local cache synchronously so the app renders
  // instantly on cold start, even if the network is slow.
  const [profile, setProfile] = useState<Profile | null>(() => readCachedProfile());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Restore session from localStorage (sync read), boot the store from the
   * cached profile immediately, then best-effort refresh the profile in the
   * background. Loading ends as soon as we know whether a session exists.
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
      writeCachedProfile(null);
      setLoading(false);
      await teardownStore();
      return;
    }

    // Boot from cached profile immediately if available.
    const cached = readCachedProfile();
    if (cached) {
      setProfile(cached);
      void bootStore(cached.username);
      void saveFCMToken(cached.username, uid);
    }
    setLoading(false);

    // Background refresh — never blocks UI.
    const result = await withTimeout(
      Promise.resolve(
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      ),
      8000,
    );
    if (!result) return; // keep cached profile
    const { data, error } = result as { data: Profile | null; error: unknown };
    if (error || !data) return;
    setProfile(data);
    writeCachedProfile(data);
    void bootStore(data.username);
    void saveFCMToken(data.username, uid);
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
          writeCachedProfile(null);
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
