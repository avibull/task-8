import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/lib/useTasks";
import { useAlerts } from "@/lib/useAlerts";
import { FilterBar } from "@/components/FilterBar";
import { AddBar } from "@/components/AddBar";
import { TaskRow } from "@/components/TaskRow";
import { ActionSheet } from "@/components/ActionSheet";
import { AlertsPanel } from "@/components/AlertsPanel";
import type { Alert, Task } from "@/lib/types";

export const Route = createFileRoute("/tasks")({ component: TasksPage });

function TasksPage() {
  const nav = useNavigate();
  const { profile, loading } = useAuth();
  const { tasks, create, toggle, update, remove } = useTasks();
  const { alerts, acknowledge, send } = useAlerts();
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ task: Task; mode: "ping" | "remind" } | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);

  useEffect(() => {
    if (!loading && !profile) nav({ to: "/login", replace: true });
  }, [loading, profile, nav]);

  const filtered = useMemo(() => {
    if (filter === "all") return tasks;
    return tasks.filter((t) => t.tags.includes(filter));
  }, [tasks, filter]);

  const active = filtered.filter((t) => !t.completed);
  const done = filtered.filter((t) => t.completed);

  const unread = alerts.filter((a) => a.recipient === profile?.username && a.status === "pending").length;

  if (loading || !profile) {
    return <div className="mono flex min-h-screen items-center justify-center bg-background text-xs text-dim">loading…</div>;
  }

  return (
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

      <FilterBar active={filter} onChange={setFilter} />
      <AddBar onAdd={create} />

      <main className="flex-1 overflow-y-auto">
        <SectionHeader label="Active" count={active.length} />
        {active.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            alerts={alerts}
            expanded={expandedId === t.id}
            onToggleComplete={() => toggle(t)}
            onExpand={() => setExpandedId(expandedId === t.id ? null : t.id)}
            onRemind={() => setSheet({ task: t, mode: "remind" })}
            onPing={() => setSheet({ task: t, mode: "ping" })}
            onChangePriority={(p) => update(t.id, { priority: p })}
            onDelete={() => { remove(t.id); setExpandedId(null); }}
          />
        ))}

        <SectionHeader label="Done" count={done.length} />
        {done.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            alerts={alerts}
            expanded={expandedId === t.id}
            onToggleComplete={() => toggle(t)}
            onExpand={() => setExpandedId(expandedId === t.id ? null : t.id)}
            onRemind={() => setSheet({ task: t, mode: "remind" })}
            onPing={() => setSheet({ task: t, mode: "ping" })}
            onChangePriority={(p) => update(t.id, { priority: p })}
            onDelete={() => { remove(t.id); setExpandedId(null); }}
          />
        ))}
        <div className="h-24" />
      </main>

      {sheet && (
        <ActionSheet
          task={sheet.task}
          mode={sheet.mode}
          onClose={() => setSheet(null)}
          onSend={async (params) => {
            await send({ task_id: sheet.task.id, ...params });
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
            if (t) { setAlertsOpen(false); setSheet({ task: t, mode: "ping" }); }
          }}
        />
      )}
    </div>
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
