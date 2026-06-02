import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTags } from "@/contexts/TagsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Profile, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  task: Task;
  mode: "ping" | "remind";
  onClose: () => void;
  onSend: (params: {
    type: "normal" | "urgent";
    trigger: "now" | "scheduled";
    scheduled_at: string | null;
    recipients: string[];
  }) => Promise<void>;
}

const REMIND_PRESETS: { label: string; minutes?: number; at?: () => Date }[] = [
  { label: "15 min", minutes: 15 },
  { label: "1 hr", minutes: 60 },
  {
    label: "Tonight 6pm",
    at: () => { const d = new Date(); d.setHours(18, 0, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1); return d; },
  },
  {
    label: "Tomorrow 9am",
    at: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; },
  },
];

export function ActionSheet({ task, mode, onClose, onSend }: Props) {
  const { profile } = useAuth();
  const { tags } = useTags();
  const [type, setType] = useState<"normal" | "urgent">("normal");
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [customTime, setCustomTime] = useState("");
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [recipients, setRecipients] = useState<string[]>(
    task.tags.filter((t) => t.startsWith("@")).map((t) => t.slice(1)).filter((u) => u !== profile?.username)
  );

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("is_active", true)
      .then(({ data }) => setAllProfiles((data as Profile[]) ?? []));
  }, []);

  const toggle = (u: string) =>
    setRecipients((r) => (r.includes(u) ? r.filter((x) => x !== u) : [...r, u]));

  const confirm = async () => {
    if (recipients.length === 0) return;
    await onSend({
      type,
      trigger: mode === "remind" ? "scheduled" : "now",
      scheduled_at: mode === "remind" && scheduledAt ? scheduledAt.toISOString() : null,
      recipients,
    });
    onClose();
  };

  const candidates = allProfiles
    .map((p) => p.username)
    .filter((u) => u !== profile?.username);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="slide-up max-h-[90vh] overflow-y-auto rounded-t-[4px] border-t border-border bg-panel p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="mono text-sm uppercase tracking-wider">
            {mode === "ping" ? "Send ping" : "Set reminder"}
          </h3>
          <button onClick={onClose} className="text-dim"><X size={18} /></button>
        </div>

        <div className="mono mb-4 rounded-[3px] border border-border bg-panel-2 p-2 text-xs text-dim">
          {task.text}
        </div>

        {mode === "remind" && (
          <div className="mb-4">
            <div className="mono mb-2 text-[10px] uppercase tracking-wider text-dim">When</div>
            <div className="flex flex-wrap gap-1.5">
              {REMIND_PRESETS.map((p) => {
                const date = p.at ? p.at() : new Date(Date.now() + (p.minutes ?? 0) * 60000);
                const active = scheduledAt?.getTime() === date.getTime();
                return (
                  <button
                    key={p.label}
                    onClick={() => setScheduledAt(date)}
                    className={cn(
                      "mono rounded-[3px] border px-2.5 py-1 text-[11px]",
                      active ? "border-accent-lime bg-accent-lime text-background" : "border-border bg-panel-2"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
              <input
                type="datetime-local"
                value={customTime}
                onChange={(e) => {
                  setCustomTime(e.target.value);
                  if (e.target.value) setScheduledAt(new Date(e.target.value));
                }}
                className="mono rounded-[3px] border border-border bg-panel-2 px-2 py-1 text-[11px]"
              />
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="mono mb-2 text-[10px] uppercase tracking-wider text-dim">Type</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setType("normal")}
              className={cn(
                "mono rounded-[3px] border px-3 py-3 text-xs uppercase",
                type === "normal" ? "border-accent-lime bg-accent-lime text-background" : "border-border bg-panel-2"
              )}
            >Normal · ding</button>
            <button
              onClick={() => setType("urgent")}
              className={cn(
                "mono rounded-[3px] border px-3 py-3 text-xs uppercase",
                type === "urgent" ? "border-[color:var(--p1)] bg-[color:var(--p1)] text-background" : "border-border bg-panel-2"
              )}
            >Urgent · repeat</button>
          </div>
        </div>

        <div className="mb-4">
          <div className="mono mb-2 text-[10px] uppercase tracking-wider text-dim">Recipients</div>
          <div className="flex flex-wrap gap-1.5">
            {candidates.map((u) => {
              const sel = recipients.includes(u);
              return (
                <button
                  key={u}
                  onClick={() => toggle(u)}
                  className={cn(
                    "mono rounded-[3px] border px-2 py-1 text-[11px]",
                    sel ? "border-accent-lime bg-accent-lime text-background" : "border-border bg-panel-2 text-foreground"
                  )}
                >@{u}</button>
              );
            })}
          </div>
        </div>

        <button
          onClick={confirm}
          disabled={recipients.length === 0 || (mode === "remind" && !scheduledAt)}
          className={cn(
            "mono w-full rounded-[3px] px-4 py-3 text-sm font-bold uppercase tracking-wider",
            "disabled:opacity-40",
            type === "urgent" ? "bg-[color:var(--p1)] text-background" : "bg-accent-lime text-background"
          )}
        >
          {mode === "ping" ? "Send ping →" : "Set reminder →"}
        </button>
      </div>
    </div>
  );
}
