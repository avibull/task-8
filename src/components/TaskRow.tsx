import { useState } from "react";
import { Check } from "lucide-react";
import type { Alert, Priority, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "./PriorityBadge";
import { formatDistanceToNow } from "date-fns";
import { UserPicker } from "./UserPicker";
import { TagPicker } from "./TagPicker";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  task: Task;
  alerts: Alert[];
  expanded: boolean;
  pulse?: boolean;
  onToggleComplete: () => void;
  onExpand: () => void;
  onSendAlert: () => void;
  onChangePriority: (p: Priority) => void;
  onUpdateTags: (tags: string[]) => void;
  onUpdateAssignees: (assigned_to: string[]) => void;
  onDelete: () => void;
}

const PRIO_CYCLE: Priority[] = ["None", "P1", "P2", "P3", "Daily"];

export function TaskRow({
  task, alerts, expanded, pulse, onToggleComplete, onExpand,
  onSendAlert, onChangePriority, onUpdateTags, onUpdateAssignees, onDelete,
}: Props) {
  const { profile } = useAuth();
  const taskAlerts = alerts.filter((a) => a.task_id === task.id);
  const [showAssign, setShowAssign] = useState(false);
  const [showTags, setShowTags] = useState(false);

  const canAssign = !!profile && (profile.is_admin || task.created_by === profile.username);

  const toggleUser = (u: string) => {
    const next = task.assigned_to.includes(u)
      ? task.assigned_to.filter((x) => x !== u)
      : [...task.assigned_to, u];
    onUpdateAssignees(next);
  };
  const togglePlain = (name: string) => {
    const next = task.tags.includes(name) ? task.tags.filter((t) => t !== name) : [...task.tags, name];
    onUpdateTags(next);
  };

  return (
    <div id={`task-${task.id}`} className={cn("border-b border-border", pulse && "ring-2 ring-accent-lime ring-inset")}>

      <div
        onClick={onExpand}
        className={cn(
          "flex items-center gap-2 px-3 py-2.5 active:bg-panel-2",
          task.completed && "opacity-50"
        )}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border",
            task.completed ? "border-accent-lime bg-accent-lime" : "border-dim"
          )}
        >
          {task.completed && <Check size={12} className="text-background" />}
        </button>
        <PriorityBadge p={task.priority} />
        <div className={cn("min-w-0 flex-1 text-sm", task.completed && "line-through")}>
          {task.text}
        </div>
        <div className="mono flex shrink-0 flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5 text-[10px]">
          {task.assigned_to.slice(0, 3).map((u) => (
            <span key={`a:${u}`} className="text-accent-lime underline decoration-dotted underline-offset-2">@{u}</span>
          ))}
          {task.tags.slice(0, 3).map((t) => (
            <span key={`t:${t}`} className="text-dim">#{t}</span>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-panel-2 px-3 py-3">
          <div className="mb-2 grid grid-cols-4 gap-1.5">
            <button onClick={onSendAlert} className="mono rounded-[3px] border border-accent-lime bg-panel px-2 py-2 text-[10px] uppercase text-accent-lime">Send alert</button>
            <button
              onClick={() => canAssign && setShowAssign(true)}
              disabled={!canAssign}
              title={canAssign ? "" : "Only the assigner can change this."}
              className={cn(
                "mono rounded-[3px] border border-border bg-panel px-2 py-2 text-[10px] uppercase",
                !canAssign && "opacity-40 cursor-not-allowed"
              )}
            >Assign</button>
            <button onClick={() => setShowTags(true)} className="mono rounded-[3px] border border-border bg-panel px-2 py-2 text-[10px] uppercase">Tags</button>
            <button onClick={onDelete} className="mono rounded-[3px] border border-[color:var(--p1)] bg-panel px-2 py-2 text-[10px] uppercase text-[color:var(--p1)]">Delete</button>
          </div>

          <button
            onClick={() => {
              const i = PRIO_CYCLE.indexOf(task.priority);
              onChangePriority(PRIO_CYCLE[(i + 1) % PRIO_CYCLE.length]);
            }}
            className="mono mb-2 w-full rounded-[3px] border border-border bg-panel px-2 py-1.5 text-[10px] uppercase"
          >
            Priority: {task.priority} (tap to cycle)
          </button>

          {(task.assigned_to.length > 0 || task.tags.length > 0) && (
            <div className="mb-2 flex flex-wrap gap-1">
              {task.assigned_to.map((u) => (
                <span key={u} className="mono rounded-[3px] border border-accent-lime px-1.5 py-0.5 text-[10px] text-accent-lime">@{u}</span>
              ))}
              {task.tags.map((t) => (
                <span key={t} className="mono rounded-[3px] border border-border px-1.5 py-0.5 text-[10px] text-dim">#{t}</span>
              ))}
            </div>
          )}

          <div className="mono text-[10px] text-dim">
            assigned by @{task.created_by} · {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
          </div>

          {taskAlerts.length > 0 && (
            <div className="mt-3">
              <div className="mono mb-1 text-[10px] uppercase tracking-wider text-dim">Pings & reminders</div>
              <div className="space-y-1">
                {taskAlerts.map((a) => (
                  <div key={a.id} className="mono flex items-center justify-between rounded-[3px] bg-panel px-2 py-1.5 text-[10px]">
                    <span>
                      {a.type === "urgent" ? "⚡" : "•"} → @{a.recipient}
                    </span>
                    <span className={cn(
                      a.status === "acknowledged" ? "text-accent-lime" : a.status === "pending" ? "text-[color:var(--p2)]" : "text-dim"
                    )}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showAssign && (
        <UserPicker
          title="ASSIGN USERS"
          selected={task.assigned_to}
          onToggle={toggleUser}
          onClose={() => setShowAssign(false)}
        />
      )}
      {showTags && (
        <TagPicker
          title="TAGS"
          selected={task.tags}
          onToggle={togglePlain}
          onClose={() => setShowTags(false)}
        />
      )}
    </div>
  );
}
