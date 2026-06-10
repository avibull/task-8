import { useEffect, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { store, mutate, manualSync } from "@/lib/localdb";
import { ensureAudioReady, playChime, playDing } from "@/lib/sound";
import { logActivity } from "@/lib/activity";
import type { Alert } from "@/lib/types";

/**
 * Alerts hook backed by the local store.
 * Plays sound when a new pending alert addressed to me arrives,
 * with the urgent repeat-chime logic preserved.
 */
export function useAlerts() {
  const { profile } = useAuth();
  const snap = useSyncExternalStore(store.subscribe, store.get, store.get);
  const alerts = snap.alerts;

  const playedRef = useRef<Set<string>>(new Set());
  const repeatTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const stopTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastIdsRef = useRef<Set<string>>(new Set());

  const stopRepeat = (id: string) => {
    const t = repeatTimers.current.get(id);
    if (t) {
      clearInterval(t);
      repeatTimers.current.delete(id);
    }
    const s = stopTimers.current.get(id);
    if (s) {
      clearTimeout(s);
      stopTimers.current.delete(id);
    }
  };

  // Detect newly arrived pending alerts addressed to me → play sound.
  useEffect(() => {
    if (!profile) return;
    const me = profile.username;
    const seen = lastIdsRef.current;
    const nextIds = new Set<string>();
    for (const a of alerts) {
      nextIds.add(a.id);
      if (seen.has(a.id)) continue;
      // New to us this render
      if (a.recipient !== me) continue;
      if (a.status !== "pending") continue;
      if (playedRef.current.has(a.id)) continue;
      playedRef.current.add(a.id);
      ensureAudioReady();
      if (a.type === "urgent") {
        playChime();
        toast.error(`URGENT ping from @${a.sender}`, { duration: 8000 });
        const iv = setInterval(() => playChime(), 10_000);
        repeatTimers.current.set(a.id, iv);
        const stop = setTimeout(() => stopRepeat(a.id), 120_000);
        stopTimers.current.set(a.id, stop);
      } else {
        playDing();
        toast(`Ping from @${a.sender}`);
      }
    }
    // Stop repeats for alerts that became acknowledged
    for (const a of alerts) {
      if (a.status === "acknowledged") stopRepeat(a.id);
    }
    lastIdsRef.current = nextIds;
  }, [alerts, profile]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      repeatTimers.current.forEach((t) => clearInterval(t));
      stopTimers.current.forEach((t) => clearTimeout(t));
      repeatTimers.current.clear();
      stopTimers.current.clear();
    };
  }, []);

  const acknowledge = async (id: string) => {
    stopRepeat(id);
    const a = alerts.find((x) => x.id === id);
    mutate.ackAlert(id);
    if (a) {
      logActivity({
        event_type: "alert_acknowledged",
        task_id: a.task_id ?? null,
        alert_id: a.id,
        meta: { sender: a.sender, alert_type: a.type },
      });
    }
  };

  const send = async (params: {
    task_id: string;
    recipients: string[];
    type: "normal" | "urgent";
    trigger?: "now" | "scheduled";
    scheduled_at?: string | null;
  }) => {
    if (!profile) return;
    const rows = params.recipients.map((r) => ({
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `local-${Math.random().toString(36).slice(2)}`,
      task_id: params.task_id,
      type: params.type,
      trigger: params.trigger ?? ("now" as const),
      scheduled_at: params.scheduled_at ?? null,
      sender: profile.username,
      recipient: r,
      status:
        params.trigger === "scheduled" ? ("scheduled" as const) : ("pending" as const),
    }));
    mutate.sendAlerts(rows);
    for (const r of params.recipients) {
      logActivity({
        event_type: "alert_sent",
        task_id: params.task_id,
        meta: { recipient: r, alert_type: params.type },
      });
    }
  };

  const refetch = async () => {
    manualSync();
  };

  // Expose alerts as readonly Alert[] (typed)
  return { alerts: alerts as Alert[], acknowledge, send, refetch };
}
