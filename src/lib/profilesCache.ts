import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/types";

let cache: Profile[] | null = null;
let inflight: Promise<Profile[]> | null = null;
const subs = new Set<(p: Profile[]) => void>();

async function load(): Promise<Profile[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true);
      cache = (data as Profile[]) ?? [];
      subs.forEach((s) => s(cache!));
      inflight = null;
      return cache;
    })();
  }
  return inflight;
}

export function useProfiles(): Profile[] {
  const [profiles, setProfiles] = useState<Profile[]>(cache ?? []);
  useEffect(() => {
    subs.add(setProfiles);
    load().then(setProfiles);
    return () => {
      subs.delete(setProfiles);
    };
  }, []);
  return profiles;
}

export function useProfileByUsername(username: string | null | undefined): Profile | null {
  const all = useProfiles();
  if (!username) return null;
  return all.find((p) => p.username === username) ?? null;
}
