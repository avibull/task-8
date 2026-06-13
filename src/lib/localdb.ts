/**
 * Offline-first local store for tasks, alerts, tags.
 *
 * - In-memory mirror is the source of truth for the UI (sync reads).
 * - IndexedDB (idb-keyval) persists the mirror across reloads.
 * - An outbox queues mutations made while offline; flushed on reconnect.
 * - Realtime channel patches the mirror from row deltas (no full refetches).
 *
 * UI reads via useSyncExternalStore(subscribe, getSnapshot).
 * Mutations are synchronous: they update the mirror, then queue work.
 */
import { get as idbGet, set as idbSet } from "idb-keyval";
import { supabase } from "@/integrations/supabase/client";
import type { Alert, Task, Tag } from "@/lib/types";

export type ConnState = "online" | "offline" | "syncing";

export type PendingOp =
  | { id: string; kind: "task.create"; row: Task }
  | { id: string; kind: "task.update"; taskId: string; patch: Partial<Task> }
  | { id: string; kind: "task.delete"; taskId: string }
  | { id: string; kind: "task.reorder"; orderedIds: string[] }
  | {
      id: string;
      kind: "alert.send";
      rows: Array<{
        id: string;
        task_id: string;
        type: "normal" | "urgent";
        trigger: "now" | "scheduled";
        scheduled_at: string | null;
        sender: string;
        recipient: string;
        status: "pending" | "scheduled";
      }>;
    }
  | { id: string; kind: "alert.ack"; alertId: string }
  | {
      id: string;
      kind: "activity.log";
      row: {
        user_id: string;
        event_type: string;
        task_id: string | null;
        alert_id: string | null;
        meta: Record<string, unknown>;
      };
    };

interface Snapshot {
  tasks: Task[];
  alerts: Alert[];
  tags: Tag[];
  pending: PendingOp[];
  conn: ConnState;
  hydrated: boolean;
}

const EMPTY: Snapshot = {
  tasks: [],
  alerts: [],
  tags: [],
  pending: [],
  conn: "online",
  hydrated: false,
};

let snap: Snapshot = EMPTY;
const listeners = new Set<() => void>();
let currentUserKey: string | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let channel: ReturnType<typeof supabase.channel> | null = null;
let flushing = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function persistSoon() {
  if (typeof window === "undefined") return;
  if (!currentUserKey) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const key = `tt:db:${currentUserKey}`;
    void idbSet(key, {
      tasks: snap.tasks,
      alerts: snap.alerts,
      tags: snap.tags,
      pending: snap.pending,
    }).catch(() => {});
  }, 150);
}

function emit() {
  listeners.forEach((l) => l());
}

function update(next: Partial<Snapshot>, persist = true) {
  const prev = snap;
  snap = { ...snap, ...next };
  const changed =
    snap.tasks !== prev.tasks ||
    snap.alerts !== prev.alerts ||
    snap.tags !== prev.tags ||
    snap.pending !== prev.pending ||
    snap.conn !== prev.conn ||
    snap.hydrated !== prev.hydrated;
  if (!changed) return;
  if (persist) persistSoon();
  emit();
}

export const store = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get() {
    return snap;
  },
};

// ---------- bootstrap / teardown ----------

/** Initialize for a given user. Loads cached data then kicks off sync. */
export async function bootStore(username: string) {
  if (currentUserKey === username) return;
  await teardownStore();
  currentUserKey = username;
  let cached: Partial<Snapshot> | undefined;
  try {
    cached = (await idbGet(`tt:db:${username}`)) as Partial<Snapshot> | undefined;
  } catch {
    cached = undefined;
  }
  snap = {
    tasks: cached?.tasks ?? [],
    alerts: cached?.alerts ?? [],
    tags: cached?.tags ?? [],
    pending: cached?.pending ?? [],
    conn: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online",
    hydrated: true,
  };
  emit();

  attachRealtime(username);
  attachConnectivity();
  // Initial sync + flush
  void initialSync();
  void flush();
}

export async function teardownStore() {
  if (channel) {
    try {
      await supabase.removeChannel(channel);
    } catch {
      /* ignore */
    }
    channel = null;
  }
  detachConnectivity();
  currentUserKey = null;
  snap = EMPTY;
  emit();
}

// ---------- realtime reconciliation ----------

function attachRealtime(username: string) {
  if (channel) return;
  channel = supabase
    .channel(`local:${username}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "tasks" }, (p) => {
      upsertTask(p.new as Task);
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks" }, (p) => {
      upsertTask(p.new as Task);
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "tasks" }, (p) => {
      const id = (p.old as { id?: string })?.id;
      if (id) removeTask(id);
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "alerts" }, (p) => {
      upsertAlert(p.new as Alert);
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "alerts" }, (p) => {
      upsertAlert(p.new as Alert);
    })
    .subscribe();
}

function upsertTask(row: Task) {
  const i = snap.tasks.findIndex((t) => t.id === row.id);
  if (i === -1) update({ tasks: [row, ...snap.tasks] });
  else {
    const next = snap.tasks.slice();
    next[i] = row;
    update({ tasks: next });
  }
}
function removeTask(id: string) {
  update({ tasks: snap.tasks.filter((t) => t.id !== id) });
}
function upsertAlert(row: Alert) {
  const i = snap.alerts.findIndex((a) => a.id === row.id);
  if (i === -1) update({ alerts: [row, ...snap.alerts] });
  else {
    const next = snap.alerts.slice();
    next[i] = row;
    update({ alerts: next });
  }
}

// ---------- connectivity ----------

function onlineHandler() {
  update({ conn: "online" }, false);
  void initialSync();
  void flush();
}
function offlineHandler() {
  update({ conn: "offline" }, false);
}
let lastFocusSync = 0;
const FOCUS_SYNC_INTERVAL = 30_000;

function focusHandler() {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    const now = Date.now();
    if (now - lastFocusSync < FOCUS_SYNC_INTERVAL) return;
    lastFocusSync = now;
    void initialSync();
    void flush();
  }
}
function attachConnectivity() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", onlineHandler);
  window.addEventListener("offline", offlineHandler);
  window.addEventListener("focus", focusHandler);
}
function detachConnectivity() {
  if (typeof window === "undefined") return;
  window.removeEventListener("online", onlineHandler);
  window.removeEventListener("offline", offlineHandler);
  window.removeEventListener("focus", focusHandler);
}

// ---------- initial / delta sync ----------

/**
 * Fast single-shot fetch on boot or reconnect.
 * No timeouts — failures just leave the cached mirror in place.
 */
async function initialSync() {
  if (!currentUserKey) return;

  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 8000);

  try {
    const [tasksRes, alertsRes, tagsRes] = await Promise.all([
      supabase.from("tasks").select("*").limit(1000).abortSignal(ac.signal),
      supabase
        .from("alerts")
        .select("*")
        .or(`sender.eq.${currentUserKey},recipient.eq.${currentUserKey}`)
        .abortSignal(ac.signal),
      supabase.from("tags").select("*").abortSignal(ac.signal),
    ]);

    update({
      tasks: tasksRes.data ?? snap.tasks,
      alerts: alertsRes.data ?? snap.alerts,
      tags: tagsRes.data ?? snap.tags,
      hydrated: true,
    });
  } catch (_e) {
    // Always set hydrated even on failure — never leave app on black screen
    update({ hydrated: true });
  } finally {
    clearTimeout(timeout);
  }
}

// ---------- outbox / mutations ----------

function enqueue(op: PendingOp) {
  update({ pending: [...snap.pending, op] });
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, 50);
}

async function flush() {
  if (flushing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  if (snap.pending.length === 0) return;
  flushing = true;
  update({ conn: "syncing" }, false);
  try {
    // Process FIFO. Drop on hard 4xx, retry later on network / 5xx.
    while (snap.pending.length > 0) {
      const op = snap.pending[0];
      const result = await runOp(op);
      if (result === "ok" || result === "drop") {
        update({ pending: snap.pending.slice(1) });
      } else {
        // network / retryable — back off
        break;
      }
    }
  } finally {
    flushing = false;
    update(
      {
        conn:
          typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online",
      },
      false,
    );
  }
}

async function runOp(op: PendingOp): Promise<"ok" | "retry" | "drop"> {
  try {
    switch (op.kind) {
      case "task.create": {
        const { error } = await supabase.from("tasks").insert(op.row);
        return classify(error);
      }
      case "task.update": {
        const { error } = await supabase.from("tasks").update(op.patch).eq("id", op.taskId);
        return classify(error);
      }
      case "task.delete": {
        const { error } = await supabase.from("tasks").delete().eq("id", op.taskId);
        return classify(error);
      }
      case "task.reorder": {
        const orders = op.orderedIds.map((_, i) => i);
        const { error } = await supabase.rpc("bulk_reorder_tasks", {
          _ids: op.orderedIds,
          _orders: orders,
        });
        return classify(error);
      }
      case "alert.send": {
        const { error } = await supabase.from("alerts").insert(op.rows);
        return classify(error);
      }
      case "alert.ack": {
        const { error } = await supabase
          .from("alerts")
          .update({ status: "acknowledged", ack_at: new Date().toISOString() })
          .eq("id", op.alertId);
        return classify(error);
      }
      case "activity.log": {
        const { error } = await supabase
          .from("activity_log")
          .insert({ ...op.row, meta: op.row.meta as never });
        return classify(error);
      }

    }
  } catch {
    return "retry";
  }
}

function classify(error: unknown): "ok" | "retry" | "drop" {
  if (!error) return "ok";
  const e = error as { code?: string; message?: string };
  const msg = (e.message ?? "").toLowerCase();
  // Network-y → retry. Anything else (RLS, validation, missing row) → drop.
  if (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("failed to fetch") ||
    msg.includes("timeout")
  ) {
    return "retry";
  }
  return "drop";
}

// ---------- mutation API (called from hooks) ----------

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `local-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export const mutate = {
  createTask(input: {
    text: string;
    tags: string[];
    assigned_to: string[];
    created_by: string;
  }): Task {
    const now = new Date().toISOString();
    const row: Task = {
      id: newId(),
      text: input.text,
      priority: "P1",
      tags: input.tags,
      assigned_to: input.assigned_to,
      created_by: input.created_by,
      completed: false,
      completed_at: null,
      sort_order: 0,
      created_at: now,
      updated_at: now,
    };
    update({ tasks: [row, ...snap.tasks] });
    enqueue({ id: newId(), kind: "task.create", row });
    return row;
  },

  updateTask(taskId: string, patch: Partial<Task>) {
    const i = snap.tasks.findIndex((t) => t.id === taskId);
    if (i === -1) return;
    const next = snap.tasks.slice();
    next[i] = { ...next[i], ...patch, updated_at: new Date().toISOString() };
    update({ tasks: next });
    enqueue({ id: newId(), kind: "task.update", taskId, patch });
  },

  toggleTask(taskId: string) {
    const t = snap.tasks.find((x) => x.id === taskId);
    if (!t) return;
    const becomingComplete = !t.completed;
    const patch: Partial<Task> = {
      completed: becomingComplete,
      completed_at: becomingComplete ? new Date().toISOString() : null,
    };
    mutate.updateTask(taskId, patch);
  },

  deleteTask(taskId: string) {
    update({ tasks: snap.tasks.filter((t) => t.id !== taskId) });
    enqueue({ id: newId(), kind: "task.delete", taskId });
  },

  reorderTasks(orderedIds: string[]) {
    const idx = new Map(orderedIds.map((id, i) => [id, i]));
    const next = snap.tasks.map((t) =>
      idx.has(t.id) ? { ...t, sort_order: idx.get(t.id)! } : t,
    );
    update({ tasks: next });
    enqueue({ id: newId(), kind: "task.reorder", orderedIds });
  },

  sendAlerts(
    rows: Array<{
      id: string;
      task_id: string;
      type: "normal" | "urgent";
      trigger: "now" | "scheduled";
      scheduled_at: string | null;
      sender: string;
      recipient: string;
      status: "pending" | "scheduled";
    }>,
  ) {
    // Optimistic: add the rows to local snap
    const ts = new Date().toISOString();
    const local: Alert[] = rows.map((r) => ({
      id: r.id,
      task_id: r.task_id,
      type: r.type,
      trigger: r.trigger,
      scheduled_at: r.scheduled_at,
      sender: r.sender,
      recipient: r.recipient,
      status: r.status,
      sent_at: r.status === "pending" ? ts : null,
      ack_at: null,
      created_at: ts,
    }));
    update({ alerts: [...local, ...snap.alerts] });
    enqueue({ id: newId(), kind: "alert.send", rows });
  },


  ackAlert(alertId: string) {
    const i = snap.alerts.findIndex((a) => a.id === alertId);
    if (i !== -1) {
      const next = snap.alerts.slice();
      next[i] = { ...next[i], status: "acknowledged", ack_at: new Date().toISOString() };
      update({ alerts: next });
    }
    enqueue({ id: newId(), kind: "alert.ack", alertId });
  },

  logActivity(row: {
    user_id: string;
    event_type: string;
    task_id: string | null;
    alert_id: string | null;
    meta: Record<string, unknown>;
  }) {
    enqueue({ id: newId(), kind: "activity.log", row });
  },
};

/** Trigger flush manually (used by retry button). */
export function manualSync() {
  void initialSync();
  void flush();
}
