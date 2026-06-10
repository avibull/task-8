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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      // Use getSession (reads from local storage, no network round-trip)
      // so the loading state always resolves even on flaky mobile networks.
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      if (!user) {
        setProfile(null);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        console.warn("[auth] profile fetch failed:", error.message);
        setProfile(null);
        return;
      }
      setProfile(data as Profile | null);
    } catch (err) {
      console.warn("[auth] loadProfile failed:", err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
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
