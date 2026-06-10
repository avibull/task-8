import { supabase } from "@/integrations/supabase/client";
import { mutate, store } from "@/lib/localdb";

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

/**
 * Fire-and-forget activity log. Queued through the outbox so it survives
 * offline use. Reads the user id from the cached session (no network).
 */
export function logActivity(args: {
  event_type: ActivityEventType;
  task_id?: string | null;
  alert_id?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    // Resolve user id without a network call.
    const sessionUser = readCachedUserId();
    if (!sessionUser) return;
    mutate.logActivity({
      user_id: sessionUser,
      event_type: args.event_type,
      task_id: args.task_id ?? null,
      alert_id: args.alert_id ?? null,
      meta: args.meta ?? {},
    });
  } catch {
    /* never throw from telemetry */
  }
}

/** Read the user's id from the persisted Supabase session in localStorage. */
function readCachedUserId(): string | null {
  if (typeof window === "undefined") return null;
  // Prefer the auth subscriber pattern via cached snapshot; fall back to localStorage.
  // store has no userId, so peek into the session storage keys Supabase uses.
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const raw = window.localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const uid =
          parsed?.user?.id ??
          parsed?.currentSession?.user?.id ??
          parsed?.session?.user?.id;
        if (uid) return uid as string;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Fetch a page of activity entries. */
export async function fetchActivity(
  before?: string | null,
  pageSize = 10,
): Promise<ActivityLogRow[]> {
  let q = supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(pageSize);
  if (before) q = q.lt("created_at", before);
  const { data } = await q;
  return (data as ActivityLogRow[]) ?? [];
}

// Touch store import so tree-shaker keeps localdb side-effects when this
// module is reached first (e.g., dev HMR).
void store;
