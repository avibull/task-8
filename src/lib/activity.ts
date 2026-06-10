import { supabase } from "@/integrations/supabase/client";

export type ActivityEventType =
  | "task_created"
  | "task_completed"
  | "task_deleted"
  | "alert_sent"
  | "alert_acknowledged";

export interface ActivityLogRow {
  id: string;
  user_id: string;
  event_type: ActivityEventType;
  task_id: string | null;
  alert_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

/** Fire-and-forget activity log insert. Never throws. */
export async function logActivity(args: {
  event_type: ActivityEventType;
  task_id?: string | null;
  alert_id?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("activity_log").insert({
      user_id: user.id,
      event_type: args.event_type,
      task_id: args.task_id ?? null,
      alert_id: args.alert_id ?? null,
      meta: (args.meta ?? {}) as never,
    });
  } catch {
    // swallow — logging must never break the UX
  }
}

/** Fetch a page of activity entries. Pass the createdAt of the last item for "load more". */
export async function fetchActivity(before?: string | null, pageSize = 10): Promise<ActivityLogRow[]> {
  let q = supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(pageSize);
  if (before) q = q.lt("created_at", before);
  const { data } = await q;
  return (data as ActivityLogRow[]) ?? [];
}
