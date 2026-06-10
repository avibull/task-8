import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Task } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";

export function useTasks() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    const { data } = await supabase.from("tasks").select("*").limit(1000);
    setTasks(((data as Task[]) ?? []));
    setLoading(false);
  };

  useEffect(() => {
    if (!profile) return;
    refetch();
    const ch = supabase
      .channel("tasks_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.username]);

  const create = async (text: string, explicitTags?: string[], assignedTo?: string[]): Promise<string | null> => {
    if (!profile || !text.trim()) return null;
    const base: string[] = explicitTags && explicitTags.length > 0 ? explicitTags : [];
    // Validate non-@ tags exist
    const nonAt = Array.from(new Set(base)).filter((t) => !t.startsWith("@"));
    let validTags: string[] = nonAt;
    if (nonAt.length > 0) {
      const { data: rows } = await supabase.from("tags").select("name").in("name", nonAt);
      const ok = new Set((rows ?? []).map((r) => r.name));
      validTags = nonAt.filter((t) => ok.has(t));
    }
    const assigned_to = Array.from(new Set((assignedTo ?? []).map((u) => u.replace(/^@/, ""))));
    const { data } = await supabase.from("tasks").insert({
      text: text.trim(),
      priority: "P1",
      tags: validTags,
      assigned_to,
      created_by: profile.username,
    }).select("id").single();
    return (data?.id as string) ?? null;
  };

  const toggle = async (t: Task) => {
    await supabase
      .from("tasks")
      .update({
        completed: !t.completed,
        completed_at: !t.completed ? new Date().toISOString() : null,
      })
      .eq("id", t.id);
  };

  const update = async (id: string, patch: Partial<Task>) => {
    await supabase.from("tasks").update(patch).eq("id", id);
  };

  const remove = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
  };

  /** Persist a new ordering. Assigns sort_order to each id by its index (lowest = top). */
  const reorder = async (orderedIds: string[]) => {
    // Optimistic local update
    setTasks((prev) => {
      const idx = new Map(orderedIds.map((id, i) => [id, i]));
      return prev.map((t) => (idx.has(t.id) ? { ...t, sort_order: idx.get(t.id)! } : t));
    });
    await Promise.all(
      orderedIds.map((id, i) =>
        supabase.from("tasks").update({ sort_order: i }).eq("id", id)
      )
    );
  };

  return { tasks, loading, create, toggle, update, remove, reorder, refetch };
}
