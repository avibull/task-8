import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ensureAudioReady, playChime, playDing } from "@/lib/sound";
import type { Alert } from "@/lib/types";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";

/**
 * Listens to realtime alert inserts/updates for the current user.
 * Prevents repeat-notify bug via in-memory Set of played alert IDs.
 * Repeats urgent chime every 10s up to 2min until ack'd.
 */
export function useAlerts() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const playedRef = useRef<Set<string>>(new Set());
  const repeatTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const stopTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const stopRepeat = (id: string) => {
    const t = repeatTimers.current.get(id);
    if (t) { clearInterval(t); repeatTimers.current.delete(id); }
    const s = stopTimers.current.get(id);
    if (s) { clearTimeout(s); stopTimers.current.delete(id); }
  };

  const handleIncoming = (a: Alert) => {
    if (a.recipient !== profile?.username) return;
    if (a.status !== "pending") return;
    if (playedRef.current.has(a.id)) return;
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
  };

  const refetch = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("alerts")
      .select("*")
      .or(`sender.eq.${profile.username},recipient.eq.${profile.username}`)
      .order("created_at", { ascending: false })
      .limit(200);
    setAlerts((data as Alert[]) ?? []);
  };

  useEffect(() => {
    if (!profile) return;
    refetch();
    // Poll: flip due 'scheduled' alerts I sent into 'pending' so realtime delivers them.
    const tick = async () => {
      const nowIso = new Date().toISOString();
      await supabase
        .from("alerts")
        .update({ status: "pending", sent_at: nowIso })
        .eq("sender", profile.username)
        .eq("status", "scheduled")
        .lte("scheduled_at", nowIso);
    };
    tick();
    const poll = setInterval(tick, 30_000);
    const channel = supabase
      .channel(`alerts:${profile.username}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        (payload) => {
          const a = payload.new as Alert;
          if (a.sender === profile.username || a.recipient === profile.username) {
            setAlerts((prev) => [a, ...prev]);
            handleIncoming(a);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "alerts" },
        (payload) => {
          const a = payload.new as Alert;
          setAlerts((prev) => prev.map((x) => (x.id === a.id ? a : x)));
          if (a.status === "acknowledged") stopRepeat(a.id);
        }
      )
      .subscribe();
    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
      repeatTimers.current.forEach((t) => clearInterval(t));
      stopTimers.current.forEach((t) => clearTimeout(t));
      repeatTimers.current.clear();
      stopTimers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.username]);

  const acknowledge = async (id: string) => {
    stopRepeat(id);
    const a = alerts.find((x) => x.id === id);
    await supabase
      .from("alerts")
      .update({ status: "acknowledged", ack_at: new Date().toISOString() })
      .eq("id", id);
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
      task_id: params.task_id,
      type: params.type,
      trigger: params.trigger ?? "now",
      scheduled_at: params.scheduled_at ?? null,
      sender: profile.username,
      recipient: r,
      status: params.trigger === "scheduled" ? ("scheduled" as const) : ("pending" as const),
    }));
    await supabase.from("alerts").insert(rows);
    for (const r of params.recipients) {
      logActivity({
        event_type: "alert_sent",
        task_id: params.task_id,
        meta: { recipient: r, alert_type: params.type },
      });
    }
    await refetch();
  };

  return { alerts, acknowledge, send, refetch };
}
