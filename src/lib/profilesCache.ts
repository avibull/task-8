import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Lightweight directory entry — no PII. */
export interface DirectoryProfile {
  id: string;
  name: string;
  username: string;
  is_active: boolean;
}

export type ProfilesStatus = "idle" | "loading" | "ready" | "error";

let cache: DirectoryProfile[] | null = null;
let lastError: string | null = null;
let inflight: Promise<DirectoryProfile[]> | null = null;
const subs = new Set<(p: DirectoryProfile[], status: ProfilesStatus, err: string | null) => void>();

function notify(status: ProfilesStatus) {
  subs.forEach((s) => s(cache ?? [], status, lastError));
}

async function load(force = false): Promise<DirectoryProfile[]> {
  if (cache && !force) return cache;
  if (!inflight) {
    notify("loading");
    inflight = (async () => {
      const { data, error } = await supabase.rpc("list_active_profiles");
      if (error) {
        lastError = error.message;
        inflight = null;
        notify("error");
        return cache ?? [];
      }
      const rows = (data as DirectoryProfile[] | null) ?? [];
      // Only commit non-empty results to cache; empty array could mean "not
      // loaded yet" vs "really empty" — keep retrying so a transient failure
      // doesn't permanently poison the cache.
      if (rows.length > 0) {
        cache = rows.slice().sort((a, b) => a.name.localeCompare(b.name));
        lastError = null;
      } else {
        cache = [];
      }
      inflight = null;
      notify("ready");
      return cache;
    })();
  }
  return inflight;
}

/** Force a refetch (e.g. after admin create/delete or sign-in). */
export function refreshProfiles(): Promise<DirectoryProfile[]> {
  cache = null;
  return load(true);
}

// Refresh on sign-in so a freshly-authenticated session pulls the directory.
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") {
      cache = null;
      void load(true);
    } else if (event === "SIGNED_OUT") {
      cache = null;
      lastError = null;
      notify("idle");
    }
  });
}

export function useProfiles(): {
  profiles: DirectoryProfile[];
  status: ProfilesStatus;
  error: string | null;
  refresh: () => void;
} {
  const [profiles, setProfiles] = useState<DirectoryProfile[]>(cache ?? []);
  const [status, setStatus] = useState<ProfilesStatus>(cache ? "ready" : "idle");
  const [error, setError] = useState<string | null>(lastError);

  useEffect(() => {
    const sub = (p: DirectoryProfile[], s: ProfilesStatus, e: string | null) => {
      setProfiles(p);
      setStatus(s);
      setError(e);
    };
    subs.add(sub);
    void load();
    return () => {
      subs.delete(sub);
    };
  }, []);

  return { profiles, status, error, refresh: () => void refreshProfiles() };
}

export function useProfileByUsername(username: string | null | undefined): DirectoryProfile | null {
  const { profiles } = useProfiles();
  if (!username) return null;
  return profiles.find((p) => p.username === username) ?? null;
}
