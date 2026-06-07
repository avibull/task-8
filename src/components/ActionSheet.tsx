import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { UserPicker } from "./UserPicker";
import { UserMention } from "./UserMention";

interface Props {
  task: Task;
  initialRecipients?: string[];
  onClose: () => void;
  onSend: (params: {
    type: "normal" | "urgent";
    trigger: "now" | "scheduled";
    scheduled_at: string | null;
    recipients: string[];
  }) => Promise<void>;
}

type WhenPreset = { key: string; label: string; resolve: () => Date | null };

const PRESETS: WhenPreset[] = [
  { key: "now", label: "Now", resolve: () => null },
  { key: "15m", label: "15 min", resolve: () => new Date(Date.now() + 15 * 60_000) },
  { key: "1h", label: "1 hr", resolve: () => new Date(Date.now() + 60 * 60_000) },
  {
    key: "tonight",
    label: "Tonight 6pm",
    resolve: () => { const d = new Date(); d.setHours(18, 0, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1); return d; },
  },
  {
    key: "tomorrow",
    label: "Tomorrow 9am",
    resolve: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; },
  },
];

export function ActionSheet({ task, initialRecipients, onClose, onSend }: Props) {
  const { profile } = useAuth();
  const [type, setType] = useState<"normal" | "urgent">("normal");
  const [whenKey, setWhenKey] = useState<string>("now");
  const [customTime, setCustomTime] = useState("");
  const [recipients, setRecipients] = useState<string[]>(
    initialRecipients ?? task.assigned_to.filter((u) => u !== profile?.username)
  );
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const resolveWhen = (): Date | null => {
    if (type === "urgent") return null;
    if (whenKey === "custom") return customTime ? new Date(customTime) : null;
    const p = PRESETS.find((x) => x.key === whenKey);
    return p ? p.resolve() : null;
  };

  const toggleRecipient = (u: string) =>
    setRecipients((r) => (r.includes(u) ? r.filter((x) => x !== u) : [...r, u]));

  const isScheduled = type === "normal" && whenKey !== "now" && resolveWhen() !== null;

  const confirm = async () => {
    if (recipients.length === 0) return;
    if (type === "urgent") {
      await onSend({ type: "urgent", trigger: "now", scheduled_at: null, recipients });
    } else {
      const when = resolveWhen();
      if (whenKey !== "now" && !when) return;
      await onSend({
        type: "normal",
        trigger: whenKey === "now" ? "now" : "scheduled",
        scheduled_at: whenKey === "now" || !when ? null : when.toISOString(),
        recipients,
      });
    }
    onClose();
  };

  const confirmLabel =
    type === "urgent" ? "SEND URGENT →" : isScheduled ? "SCHEDULE ALERT →" : "SEND ALERT →";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="slide-up max-h-[92vh] overflow-y-auto rounded-t-[4px] border-t border-border bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center px-4 pb-2 pt-2">
          <div className="mb-2 h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="flex items-start justify-between gap-2 px-4">
          <div className="min-w-0 flex-1">
            <div className="mono text-[10px] uppercase tracking-wider text-dim">SEND ALERT</div>
            <div className="mt-1 text-base leading-snug text-foreground">{task.text}</div>
          </div>
          <button onClick={onClose} className="text-dim"><X size={18} /></button>
        </div>

        <div className="px-4 pt-4">
          <div className="mono mb-2 text-[10px] uppercase tracking-wider text-dim">TYPE</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setType("normal")}
              className={cn(
                "rounded-[3px] border-2 bg-panel-2 px-3 py-3 text-left",
                type === "normal" ? "border-accent-lime" : "border-border"
              )}
            >
              <div className="mono text-sm font-bold uppercase tracking-wide">Normal</div>
              <div className="mono mt-0.5 text-[10px] text-dim">single notification + ding</div>
            </button>
            <button
              onClick={() => setType("urgent")}
              className={cn(
                "rounded-[3px] border-2 bg-panel-2 px-3 py-3 text-left",
                type === "urgent" ? "border-[color:var(--p1)]" : "border-border"
              )}
            >
              <div className="mono text-sm font-bold uppercase tracking-wide">Urgent</div>
              <div className="mono mt-0.5 text-[10px] text-dim">repeats every 10s until ack</div>
            </button>
          </div>
        </div>

        {type === "normal" && (
          <div className="px-4 pt-4">
            <div className="mono mb-2 text-[10px] uppercase tracking-wider text-dim">WHEN</div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => {
                const sel = whenKey === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setWhenKey(p.key)}
                    className={cn(
                      "mono rounded-[3px] border px-2.5 py-1.5 text-[11px]",
                      sel ? "border-accent-lime bg-accent-lime text-background" : "border-border bg-panel-2"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
              <button
                onClick={() => setWhenKey("custom")}
                className={cn(
                  "mono rounded-[3px] border px-2.5 py-1.5 text-[11px]",
                  whenKey === "custom" ? "border-accent-lime bg-accent-lime text-background" : "border-border bg-panel-2"
                )}
              >
                Custom...
              </button>
              {whenKey === "custom" && (
                <input
                  type="datetime-local"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="mono rounded-[3px] border border-border bg-panel-2 px-2 py-1 text-[11px]"
                />
              )}
            </div>
          </div>
        )}

        <div className="px-4 pt-4">
          <div className="mono mb-2 text-[10px] uppercase tracking-wider text-dim">TO</div>
          <div className="flex flex-wrap gap-1.5">
            {recipients.map((u) => (
              <span
                key={u}
                className="mono inline-flex items-center gap-1 rounded-[3px] border border-accent-lime bg-accent-lime px-1.5 py-1 text-[11px] text-background"
              >
                <UserMention
                  username={u}
                  task={task}
                  className="text-background underline decoration-dotted underline-offset-2 hover:text-background/80"
                />
                <button
                  onClick={() => toggleRecipient(u)}
                  className="text-background/70 hover:text-background"
                  aria-label={`Remove ${u}`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <button
              onClick={() => setShowPicker(true)}
              className="mono rounded-[3px] border border-dashed border-border bg-panel-2 px-2 py-1 text-[11px] text-dim hover:border-accent-lime hover:text-foreground"
            >
              + Add
            </button>
          </div>
        </div>

        <div className="p-4 pt-5">
          <button
            onClick={confirm}
            disabled={recipients.length === 0 || (type === "normal" && whenKey === "custom" && !customTime)}
            className={cn(
              "mono w-full rounded-[3px] px-4 py-3 text-sm font-bold uppercase tracking-wider",
              "disabled:opacity-40",
              type === "urgent" ? "bg-[color:var(--p1)] text-background" : "bg-accent-lime text-background"
            )}
          >
            {confirmLabel}
          </button>
        </div>

        {showPicker && (
          <UserPicker
            title="ADD RECIPIENT"
            selected={recipients}
            onToggle={toggleRecipient}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    </div>
  );
}
