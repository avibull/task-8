import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tag } from "@/lib/types";
import { useAuth } from "./AuthContext";
import { store, manualSync } from "@/lib/localdb";

interface TagsCtx {
  tags: Tag[];
  loading: boolean;
  refetch: () => Promise<void>;
  addCustom: (name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const Ctx = createContext<TagsCtx>({
  tags: [],
  loading: true,
  refetch: async () => {},
  addCustom: async () => {},
  remove: async () => {},
});

/**
 * Tags are admin-managed and change rarely. Read from the local store;
 * mutations go directly to the network and trigger a manual sync to refresh.
 */
export function TagsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const snap = useSyncExternalStore(store.subscribe, store.get, store.get);
  const tags = snap.tags;
  const loading = !snap.hydrated;

  const refetch = useCallback(async () => {
    manualSync();
  }, []);

  const addCustom = useCallback(
    async (name: string) => {
      if (!profile) return;
      const clean = name
        .trim()
        .toLowerCase()
        .replace(/^@/, "")
        .replace(/[^a-z0-9_-]/g, "");
      if (!clean) return;
      await supabase.from("tags").insert({ name: clean });
      manualSync();
    },
    [profile],
  );

  const remove = useCallback(
    async (id: string) => {
      const t = tags.find((x) => x.id === id);
      if (!t) return;
      await supabase.rpc("remove_tag_from_tasks", { _tag_name: t.name });
      await supabase.from("tags").delete().eq("id", id);
      manualSync();
    },
    [tags],
  );

  return (
    <Ctx.Provider value={{ tags, loading, refetch, addCustom, remove }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTags = () => useContext(Ctx);
