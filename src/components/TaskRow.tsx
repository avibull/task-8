import { memo, useState } from "react";
import { Check } from "lucide-react";
import type { Alert, Priority, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "./PriorityBadge";

import { UserPicker } from "./UserPicker";
import { TagPicker } from "./TagPicker";
import { UserMention } from "./UserMention";
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
  onUpdateText: (text: string) => void;
  onDelete: () => void;
}


const PRIO_CYCLE: Priority[] = ["P1", "P2", "P3", "Daily", "None"];

export const TaskRow = memo(function TaskRow({
  task, alerts, expanded, pulse, onToggleComplete, onExpand,
  onSendAlert, onChangePriority, onUpdateTags, onUpdateAssignees, onUpdateText, onDelete,
}: Props) {
  const { profile } = useAuth();
  const taskAlerts = alerts.filter((a) => a.task_id === task.id);
  const [showAssign, setShowAssign] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);

  const canAssign = !!profile && (profile.is_admin || task.created_by === profile.username);
  const isMine = profile?.username === task.created_by;

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

  const cyclePriority = () => {
    const i = PRIO_CYCLE.indexOf(task.priority);
    onChangePriority(PRIO_CYCLE[(i + 1) % PRIO_CYCLE.length]);
  };

  return (
    <div id={`task-${task.id}`} className={cn("border-b border-border", pulse && "ring-2 ring-accent-lime ring-inset")}>

      <div
        onClick={onExpand}
        className={cn(
          "px-3 py-2.5 active:bg-panel-2",
          task.completed && "opacity-50"
        )}
      >
        <div className="flex items-center gap-2">
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
          <div className={cn("min-w-0 flex-1 truncate text-sm", task.completed && "line-through")}>
            {task.text}
          </div>
        </div>
        <div
          className="mono mt-1 flex items-center gap-x-1.5 overflow-x-auto whitespace-nowrap text-[10px] [&::-webkit-scrollbar]:hidden"
          style={{ paddingLeft: "calc(1.25rem + 0.5rem + 1.75rem + 0.5rem)", scrollbarWidth: "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          {task.assigned_to.map((u) => (
            <UserMention key={`a:${u}`} username={u} task={task} className="shrink-0 text-[10px] text-accent-lime underline decoration-dotted underline-offset-2" />
          ))}
          {task.tags.map((t) => (
            <span key={`t:${t}`} className="shrink-0 text-dim">#{t}</span>
          ))}
          <span className="shrink-0 text-dim">·</span>
          {isMine ? (
            <span className="shrink-0 text-dim">by you</span>
          ) : (
            <span className="shrink-0 text-dim inline-flex items-center gap-1">
              by <UserMention username={task.created_by} task={task} className="text-[10px] text-accent-lime underline decoration-dotted underline-offset-2" />
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-panel-2 px-3 py-3">
          {editing ? (
            <div className="mb-2 flex items-center gap-1.5">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = draft.trim();
                    if (v && v !== task.text) onUpdateText(v);
                    setEditing(false);
                  } else if (e.key === "Escape") {
                    setDraft(task.text);
                    setEditing(false);
                  }
                }}
                className="mono flex-1 rounded-[3px] border border-border bg-panel px-2 py-2 text-sm text-foreground focus:border-accent-lime focus:outline-none"
              />
              <button
                onClick={() => {
                  const v = draft.trim();
                  if (v && v !== task.text) onUpdateText(v);
                  setEditing(false);
                }}
                className="mono rounded-[3px] border border-accent-lime bg-panel px-2 py-2 text-[10px] uppercase text-accent-lime"
              >Save</button>
              <button
                onClick={() => { setDraft(task.text); setEditing(false); }}
                className="mono rounded-[3px] border border-border bg-panel px-2 py-2 text-[10px] uppercase text-dim"
              >Cancel</button>
            </div>
          ) : null}
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={onSendAlert} className="mono rounded-[3px] border border-accent-lime bg-panel px-1 py-2 text-[10px] uppercase text-accent-lime">Alert</button>
            <button
              onClick={() => canAssign && setShowAssign(true)}
              disabled={!canAssign}
              title={canAssign ? "" : "Only the assigner can change this."}
              className={cn(
                "mono rounded-[3px] border border-border bg-panel px-1 py-2 text-[10px] uppercase",
                !canAssign && "opacity-40 cursor-not-allowed"
              )}
            >Assign</button>
            <button
              onClick={cyclePriority}
              className="mono rounded-[3px] border border-border bg-panel px-1 py-2 text-[10px] uppercase flex items-center justify-center"
              title="Tap to cycle priority"
            >
              <PriorityBadge p={task.priority} />
            </button>
            <button onClick={() => setShowTags(true)} className="mono rounded-[3px] border border-border bg-panel px-1 py-2 text-[10px] uppercase">Tags</button>
            <button
              onClick={() => { setDraft(task.text); setEditing((v) => !v); }}
              className="mono rounded-[3px] border border-border bg-panel px-1 py-2 text-[10px] uppercase"
            >Edit</button>
            <button onClick={onDelete} className="mono rounded-[3px] border border-[color:var(--p1)] bg-panel px-1 py-2 text-[10px] uppercase text-[color:var(--p1)]">Delete</button>
          </div>

          {taskAlerts.length > 0 && (
            <div className="mt-3">
              <div className="mono mb-1 text-[10px] uppercase tracking-wider text-dim">Pings & reminders</div>
              <div className="space-y-1">
                {taskAlerts.map((a) => (
                  <div key={a.id} className="mono flex items-center justify-between rounded-[3px] bg-panel px-2 py-1.5 text-[10px]">
                    <span className="inline-flex items-center gap-1">
                      <span>{a.type === "urgent" ? "⚡" : "•"} →</span>
                      <UserMention username={a.recipient} task={task} className="text-[10px] text-accent-lime underline decoration-dotted underline-offset-2" />
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
});
