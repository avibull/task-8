import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Lightweight directory entry — no PII. */
export interface DirectoryProfile {
  id: string;
  name: string;
  username: string;
  is_active: boolean;
}

let cache: DirectoryProfile[] | null = null;
let inflight: Promise<DirectoryProfile[]> | null = null;
const subs = new Set<(p: DirectoryProfile[]) => void>();

async function load(): Promise<DirectoryProfile[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = (async () => {
      const { data } = await supabase.rpc("list_active_profiles");
      cache = ((data as DirectoryProfile[]) ?? []);
      subs.forEach((s) => s(cache!));
      inflight = null;
      return cache;
    })();
  }
  return inflight;
}

export function useProfiles(): DirectoryProfile[] {
  const [profiles, setProfiles] = useState<DirectoryProfile[]>(cache ?? []);
  useEffect(() => {
    subs.add(setProfiles);
    load().then(setProfiles);
    return () => {
      subs.delete(setProfiles);
    };
  }, []);
  return profiles;
}

export function useProfileByUsername(username: string | null | undefined): DirectoryProfile | null {
  const all = useProfiles();
  if (!username) return null;
  return all.find((p) => p.username === username) ?? null;
}
