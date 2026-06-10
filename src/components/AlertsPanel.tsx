import { useState } from "react";
import { X } from "lucide-react";
import type { Alert, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { UserMention } from "./UserMention";

interface Props {
  alerts: Alert[];
  tasks: Task[];
  onClose: () => void;
  onAck: (id: string) => void;
  onRepingAlert: (a: Alert) => void;
}

export function AlertsPanel({ alerts, tasks, onClose, onAck, onRepingAlert }: Props) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"received" | "sent">("received");
  const me = profile?.username ?? "";

  const received = alerts.filter((a) => a.recipient === me);
  const sent = alerts.filter((a) => a.sender === me);
  const unread = received.filter((a) => a.status === "pending").length;

  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const list = tab === "received" ? received : sent;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border bg-panel px-4 py-3">
        <h2 className="mono text-sm uppercase tracking-wider">alerts</h2>
        <button onClick={onClose} className="text-dim"><X size={20} /></button>
      </div>
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab("received")}
          className={cn(
            "mono flex-1 px-4 py-3 text-xs uppercase tracking-wider",
            tab === "received" ? "border-b-2 border-accent-lime text-foreground" : "text-dim"
          )}
        >
          Received {unread > 0 && <span className="ml-1 rounded-full bg-[color:var(--p1)] px-1.5 text-background">{unread}</span>}
        </button>
        <button
          onClick={() => setTab("sent")}
          className={cn(
            "mono flex-1 px-4 py-3 text-xs uppercase tracking-wider",
            tab === "sent" ? "border-b-2 border-accent-lime text-foreground" : "text-dim"
          )}
        >
          Sent <span className="ml-1 text-dim">{sent.length}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {list.length === 0 && (
          <div className="mono p-10 text-center text-[11px] uppercase tracking-wider text-[color:var(--color-text-faint)]">
            {tab === "received" ? "No alerts received." : "No alerts sent."}
          </div>
        )}
        {list.map((a) => {
          const task = a.task_id ? taskMap.get(a.task_id) : null;
          const other = tab === "received" ? a.sender : a.recipient;
          const acked = a.status === "acknowledged";
          return (
            <div
              key={a.id}
              className={cn(
                "border-b border-border p-3",
                acked && "opacity-50"
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="mono text-[10px] uppercase text-dim">
                  {tab === "received" ? "from" : "to"}
                </span>
                <UserMention username={other} task={task ?? null} className="mono text-[10px] text-accent-lime underline decoration-dotted underline-offset-2" />
                <span className={cn(
                  "mono rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase",
                  a.type === "urgent" ? "bg-[color:var(--p1)] text-background" : "bg-panel-2 text-dim"
                )}>{a.type}</span>
                {a.status === "pending" && tab === "sent" && (
                  <span className="pulse-dot ml-auto inline-block h-2 w-2 rounded-full bg-[color:var(--p2)]" />
                )}
                {acked && (
                  <span className="ml-auto inline-block h-2 w-2 rounded-full bg-accent-lime" />
                )}
              </div>
              <div className="text-sm">{task?.text ?? "(task removed)"}</div>
              <div className="mono mt-1 text-[10px] text-dim">
                {a.sent_at ? formatDistanceToNow(new Date(a.sent_at), { addSuffix: true }) : ""}
              </div>
              {tab === "received" && a.status === "pending" && (
                <button
                  onClick={() => onAck(a.id)}
                  className="mono mt-2 rounded-[3px] bg-accent-lime px-3 py-1.5 text-[11px] font-bold uppercase text-background"
                >Acknowledge</button>
              )}
              {tab === "sent" && a.status === "pending" && (
                <button
                  onClick={() => onRepingAlert(a)}
                  className="mono mt-2 rounded-[3px] border border-border bg-panel-2 px-3 py-1.5 text-[11px] uppercase"
                >Re-ping</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
