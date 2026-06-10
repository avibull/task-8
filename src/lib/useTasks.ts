import { useSyncExternalStore } from "react";
import type { Task } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { store, mutate, manualSync } from "@/lib/localdb";
import { logActivity } from "@/lib/activity";

/**
 * Tasks hook backed by the local store. Reads are synchronous from the
 * in-memory mirror; mutations are optimistic and queued in the outbox.
 * Realtime patches the mirror in the background.
 */
export function useTasks() {
  const { profile } = useAuth();
  const snap = useSyncExternalStore(store.subscribe, store.get, store.get);
  const tasks = snap.tasks;
  const loading = !snap.hydrated;

  const create = async (
    text: string,
    explicitTags?: string[],
    assignedTo?: string[],
  ): Promise<string | null> => {
    if (!profile || !text.trim()) return null;

    // Validate non-@ tag names against the local cache (no network).
    const base = explicitTags ?? [];
    const tagSet = new Set(snap.tags.map((t) => t.name));
    const validTags = Array.from(new Set(base)).filter(
      (t) => t.startsWith("@") || tagSet.has(t),
    );
    const assigned = Array.from(new Set((assignedTo ?? []).map((u) => u.replace(/^@/, ""))));

    const row = mutate.createTask({
      text: text.trim(),
      tags: validTags,
      assigned_to: assigned,
      created_by: profile.username,
    });
    logActivity({ event_type: "task_created", task_id: row.id, meta: { task_text: row.text } });
    return row.id;
  };

  const toggle = async (t: Task) => {
    mutate.toggleTask(t.id);
    if (!t.completed) {
      // becoming complete
      logActivity({ event_type: "task_completed", task_id: t.id, meta: { task_text: t.text } });
    }
  };

  const update = async (id: string, patch: Partial<Task>) => {
    mutate.updateTask(id, patch);
  };

  const remove = async (id: string) => {
    const t = tasks.find((x) => x.id === id);
    mutate.deleteTask(id);
    if (t) {
      logActivity({ event_type: "task_deleted", task_id: null, meta: { task_text: t.text } });
    }
  };

  const reorder = async (orderedIds: string[]) => {
    mutate.reorderTasks(orderedIds);
  };

  const refetch = async () => {
    manualSync();
  };

  return { tasks, loading, create, toggle, update, remove, reorder, refetch };
}

// Re-export for callers that previously used supabase directly.
export { supabase };
