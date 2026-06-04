import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Task, Priority } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";

const PRIO_RANK: Record<Priority, number> = { P1: 0, P2: 1, P3: 2, Daily: 3, None: 4 };

export function useTasks() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    const { data } = await supabase.from("tasks").select("*").limit(1000);
    const sorted = ((data as Task[]) ?? []).sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const p = PRIO_RANK[a.priority] - PRIO_RANK[b.priority];
      if (p !== 0) return p;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return b.created_at.localeCompare(a.created_at);
    });
    setTasks(sorted);
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

  const create = async (text: string, explicitTags?: string[]) => {
    if (!profile || !text.trim()) return;
    // parse @username tags from text
    const at = Array.from(text.matchAll(/@([a-z0-9_-]+)/gi)).map((m) => `@${m[1].toLowerCase()}`);
    const base = explicitTags && explicitTags.length > 0 ? explicitTags : ["today"];
    const tags = Array.from(new Set([...base, ...at]));
    await supabase.from("tasks").insert({
      text: text.trim(),
      priority: "None",
      tags,
      created_by: profile.username,
    });
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

  return { tasks, loading, create, toggle, update, remove, refetch };
}
