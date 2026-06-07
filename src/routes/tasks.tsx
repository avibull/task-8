import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/lib/useTasks";
import { useAlerts } from "@/lib/useAlerts";
import { FilterBar, type Scope } from "@/components/FilterBar";
import { AddBar } from "@/components/AddBar";
import { TaskRow } from "@/components/TaskRow";
import { ActionSheet } from "@/components/ActionSheet";
import { AlertsPanel } from "@/components/AlertsPanel";
import { MentionProvider } from "@/contexts/MentionContext";
import type { Alert, Task } from "@/lib/types";

export const Route = createFileRoute("/tasks")({ component: TasksPage });

function TasksPage() {
  const nav = useNavigate();
  const { profile, loading } = useAuth();
  const { tasks, create, toggle, update, remove } = useTasks();
  const { alerts, acknowledge, send } = useAlerts();
  const [scope, setScope] = useState<Scope>("mine");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [sheetTask, setSheetTask] = useState<Task | null>(null);
  const [sheetOverride, setSheetOverride] = useState<string[] | undefined>(undefined);
  const [alertsOpen, setAlertsOpen] = useState(false);

  useEffect(() => {
    if (!loading && !profile) nav({ to: "/login", replace: true });
  }, [loading, profile, nav]);

  const me = profile?.username ?? "";

  const filtered = useMemo(() => {
    let list = tasks;
    if (scope === "mine") {
      list = list.filter((t) =>
        t.assigned_to.includes(me) ||
        (t.assigned_to.length === 0 && t.created_by === me)
      );
    } else if (scope === "delegated") {
      list = list.filter((t) =>
        t.created_by === me && t.assigned_to.some((u) => u !== me)
      );
    }
    if (tagFilter) list = list.filter((t) => t.tags.includes(tagFilter));
    return list;
  }, [tasks, scope, tagFilter, me]);

  const active = filtered.filter((t) => !t.completed);
  const done = filtered.filter((t) => t.completed);

  const unread = alerts.filter((a) => a.recipient === profile?.username && a.status === "pending").length;

  if (loading || !profile) {
    return <div className="mono flex min-h-screen items-center justify-center bg-background text-xs text-dim">loading…</div>;
  }


  const handleAdd = async (text: string, tags: string[], assigned: string[]) => {
    const id = await create(text, tags, assigned);
    if (!id) return;
    setExpandedId(id);
    setPulseId(id);
    setTimeout(() => setPulseId((p) => (p === id ? null : p)), 600);
    requestAnimationFrame(() => {
      const el = document.getElementById(`task-${id}`);
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };

  const rowProps = (t: Task) => ({
    key: t.id,
    task: t,
    alerts,
    expanded: expandedId === t.id,
    pulse: pulseId === t.id,
    onToggleComplete: () => toggle(t),
    onExpand: () => setExpandedId(expandedId === t.id ? null : t.id),
    onSendAlert: () => setSheetTask(t),
    onChangePriority: (p: Task["priority"]) => update(t.id, { priority: p }),
    onUpdateTags: (tags: string[]) => update(t.id, { tags }),
    onUpdateAssignees: (assigned_to: string[]) => update(t.id, { assigned_to }),
    onDelete: () => { remove(t.id); setExpandedId(null); },
  });

  return (
    <MentionProvider
      onPingTask={(t, username) => {
        setAlertsOpen(false);
        setSheetOverride([username]);
        setSheetTask(t);
      }}
    >
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border bg-panel px-4 py-3">
          <h1 className="mono text-base font-bold">
            turbo<span className="text-accent-lime">·</span>task
          </h1>
          <div className="flex items-center gap-3">
            <Link to="/settings" className="text-dim hover:text-foreground">
              <SettingsIcon size={18} />
            </Link>
            <button
              onClick={() => setAlertsOpen(true)}
              className="relative text-foreground"
              aria-label="Alerts"
            >
              <Bell size={20} />
              {unread > 0 && (
                <span className="mono absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--p1)] px-1 text-[9px] font-bold text-background">
                  {unread}
                </span>
              )}
            </button>
          </div>
        </header>

        <FilterBar scope={scope} onScope={setScope} tag={tagFilter} onTag={setTagFilter} />
        <AddBar onAdd={handleAdd} />

        <main className="flex-1 overflow-y-auto">
          <SectionHeader label="Active" count={active.length} />
          {active.map((t) => (<TaskRow {...rowProps(t)} />))}

          <SectionHeader label="Done" count={done.length} />
          {done.map((t) => (<TaskRow {...rowProps(t)} />))}
          <div className="h-24" />
        </main>

        {sheetTask && (
          <ActionSheet
            task={sheetTask}
            initialRecipients={sheetOverride}
            onClose={() => { setSheetTask(null); setSheetOverride(undefined); }}
            onSend={async (params) => {
              await send({ task_id: sheetTask.id, ...params });
            }}
          />
        )}

        {alertsOpen && (
          <AlertsPanel
            alerts={alerts}
            tasks={tasks}
            onClose={() => setAlertsOpen(false)}
            onAck={acknowledge}
            onRepingAlert={(a: Alert) => {
              const t = tasks.find((x) => x.id === a.task_id);
              if (t) { setAlertsOpen(false); setSheetOverride(undefined); setSheetTask(t); }
            }}
          />
        )}
      </div>
    </MentionProvider>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="mono flex items-center justify-between border-b border-border bg-background px-3 py-1.5 text-[10px] uppercase tracking-wider text-dim">
      <span>▸ {label}</span>
      <span>{count}</span>
    </div>
  );
}
