import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tag } from "@/lib/types";
import { useAuth } from "./AuthContext";

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

export function TagsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!profile) {
      setTags([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("tags").select("*").order("name");
    setTags((data as Tag[]) ?? []);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [refetch]);

  return (
    <Ctx.Provider
      value={{
        tags,
        loading,
        refetch,
        addCustom: async (name) => {
          const clean = name.trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_-]/g, "");
          if (!clean) return;
          await supabase.from("tags").insert({ name: clean });
          await refetch();
        },
        remove: async (id) => {
          // Find tag name first so we can scrub it from tasks
          const t = tags.find((x) => x.id === id);
          if (!t || t.is_default || t.is_user_tag) return;
          await supabase.from("tags").delete().eq("id", id);
          // Pull tasks that have it and remove
          const { data: hits } = await supabase
            .from("tasks")
            .select("id, tags")
            .contains("tags", [t.name]);
          for (const row of hits ?? []) {
            await supabase
              .from("tasks")
              .update({ tags: (row.tags as string[]).filter((x) => x !== t.name) })
              .eq("id", row.id);
          }
          await refetch();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useTags = () => useContext(Ctx);
