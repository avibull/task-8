import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, Settings as SettingsIcon } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/lib/useTasks";
import { useAlerts } from "@/lib/useAlerts";
import { FilterBar, type Scope } from "@/components/FilterBar";
import { AddBar } from "@/components/AddBar";
import { SortableTaskRow } from "@/components/SortableTaskRow";
import { ActionSheet } from "@/components/ActionSheet";
import { AlertsPanel } from "@/components/AlertsPanel";
import { SortControl, type SortKey } from "@/components/SortControl";
import { MentionProvider } from "@/contexts/MentionContext";
import { TaskListSkeleton } from "@/components/TaskListSkeleton";
import { SyncStatus } from "@/components/SyncStatus";

import type { Alert, Priority, Task } from "@/lib/types";

const PRIO_RANK: Record<Priority, number> = { P1: 0, P2: 1, P3: 2, Daily: 3, None: 4 };
const SORT_STORAGE_KEY = "turbotask.sort";

function applySort(list: Task[], sort: SortKey): Task[] {
  const incomplete = list.filter((t) => !t.completed);
  const done = list.filter((t) => t.completed);
  const cmp = (a: Task, b: Task): number => {
    switch (sort) {
      case "custom":
        return a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at);
      case "priority_desc":
        return PRIO_RANK[a.priority] - PRIO_RANK[b.priority] || b.created_at.localeCompare(a.created_at);
      case "priority_asc":
        return PRIO_RANK[b.priority] - PRIO_RANK[a.priority] || b.created_at.localeCompare(a.created_at);
      case "date_desc":
        return b.created_at.localeCompare(a.created_at);
      case "date_asc":
        return a.created_at.localeCompare(b.created_at);
      case "az":
        return a.text.localeCompare(b.text);
      case "za":
        return b.text.localeCompare(a.text);
      default:
        return 0;
    }
  };
  return [...incomplete.sort(cmp), ...done.sort(cmp)];
}

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — task8" },
      {
        name: "description",
        content:
          "Your collaborative task inbox in task8. Capture, assign, tag, prioritize, and ping teammates in real time.",
      },
      { property: "og:title", content: "Tasks — task8" },
      {
        property: "og:description",
        content: "Collaborative team task management — assign, tag, and ping in real time.",
      },
      { property: "og:url", content: "https://turbo-task.lovable.app/tasks" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const nav = useNavigate();
  const { profile, loading } = useAuth();
  const { tasks, loading: tasksLoading, create, toggle, update, remove, reorder } = useTasks();
  const { alerts, acknowledge, send } = useAlerts();
  const [scope, setScope] = useState<Scope>("mine");
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [sheetTask, setSheetTask] = useState<Task | null>(null);
  const [sheetOverride, setSheetOverride] = useState<string[] | undefined>(undefined);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>(() => {
    if (typeof window === "undefined") return "priority_desc";
    const v = window.localStorage.getItem(SORT_STORAGE_KEY);
    return (v as SortKey) || "priority_desc";
  });

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(SORT_STORAGE_KEY, sort);
  }, [sort]);

  useEffect(() => {
    if (!loading && !profile) nav({ to: "/login", replace: true });
  }, [loading, profile, nav]);

  // Deep-link from Activity log: open and scroll to the requested task.
  useEffect(() => {
    if (typeof window === "undefined" || tasksLoading) return;
    const id = window.sessionStorage.getItem("open_task_id");
    if (!id) return;
    const exists = tasks.some((t) => t.id === id);
    if (!exists) {
      window.sessionStorage.removeItem("open_task_id");
      return;
    }
    setExpandedId(id);
    setPulseId(id);
    setTimeout(() => setPulseId((p) => (p === id ? null : p)), 600);
    requestAnimationFrame(() => {
      const el = document.getElementById(`task-${id}`);
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    window.sessionStorage.removeItem("open_task_id");
  }, [tasksLoading, tasks]);

  // Drag is initiated from the grip handle; a small distance threshold keeps
  // taps on the handle from being misread as drags while making any movement
  // an immediate drag. Row body taps never reach these sensors.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 6 } }),
  );

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
    if (tagFilters.length > 0) {
      list = list.filter((t) => tagFilters.every((tag) => t.tags.includes(tag)));
    }
    return applySort(list, sort);
  }, [tasks, scope, tagFilters, me, sort]);

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

  const toggleTag = (name: string) =>
    setTagFilters((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));

  const rowProps = (t: Task) => ({
    task: t,
    alerts,
    expanded: expandedId === t.id,
    pulse: pulseId === t.id,
    onToggleComplete: () => toggle(t),
    onExpand: () => setExpandedId((prev) => (prev === t.id ? null : t.id)),
    onSendAlert: () => setSheetTask(t),
    onChangePriority: (p: Task["priority"]) => update(t.id, { priority: p }),
    onUpdateTags: (tags: string[]) => update(t.id, { tags }),
    onUpdateAssignees: (assigned_to: string[]) => update(t.id, { assigned_to }),
    onDelete: () => { remove(t.id); setExpandedId(null); },
  });

  const handleDragEnd = (e: DragEndEvent) => {
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    // Reorder within the full visible list (active + done) using current displayed order.
    const ids = [...active.map((t) => t.id), ...done.map((t) => t.id)];
    const from = ids.indexOf(String(a.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = arrayMove(ids, from, to);
    reorder(next);
    if (sort !== "custom") setSort("custom");
  };

  const allIds = [...active.map((t) => t.id), ...done.map((t) => t.id)];

  return (
    <MentionProvider
      onPingTask={(t, username) => {
        setAlertsOpen(false);
        setSheetOverride([username]);
        setSheetTask(t);
      }}
    >
      <div className="flex h-dvh flex-col bg-background overflow-hidden">
        <header className="flex items-center justify-between border-b border-border bg-panel px-4 py-3">
          <h1 className="sr-only">Tasks — Collaborative management</h1>
          <div className="mono flex items-center gap-2 text-base font-bold">
            <span aria-hidden="true">
              task<span className="text-accent-lime">·</span>8
            </span>
            <SyncStatus />
          </div>

          <div className="flex items-center gap-3">
            <Link to="/settings" aria-label="Settings" className="text-dim hover:text-foreground">
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

        <FilterBar
          scope={scope}
          onScope={setScope}
          tags={tagFilters}
          onToggleTag={toggleTag}
          onClearTags={() => setTagFilters([])}
        />
        <AddBar onAdd={handleAdd} />
        <SortControl value={sort} onChange={setSort} />

        <main className="flex-1 overflow-y-auto" style={{ overscrollBehaviorY: "contain" }}>
          {tasksLoading ? (
            <TaskListSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyTasks scope={scope} tagFilters={tagFilters} />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
                <SectionHeader label="Active" count={active.length} />
                {active.map((t) => (<SortableTaskRow key={t.id} {...rowProps(t)} />))}

                <SectionHeader label="Done" count={done.length} />
                {done.map((t) => (<SortableTaskRow key={t.id} {...rowProps(t)} />))}
              </SortableContext>
            </DndContext>
          )}
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
    <h2 className="mono flex items-center justify-between border-b border-border bg-background px-3 py-1.5 text-[10px] font-normal uppercase tracking-wider text-dim">
      <span>▸ {label}</span>
      <span>{count}</span>
    </h2>
  );
}

function EmptyTasks({ scope, tagFilters }: { scope: Scope; tagFilters: string[] }) {
  let msg = "No tasks yet. Add your first one above.";
  if (tagFilters.length > 0) {
    msg = `No tasks tagged #${tagFilters[0]}.`;
  } else if (scope === "mine") {
    msg = "Nothing assigned to you. Add a task above or check All.";
  } else if (scope === "delegated") {
    msg = "No tasks assigned to others yet.";
  }
  return (
    <div className="mono px-8 py-16 text-center text-[11px] uppercase tracking-wider text-[color:var(--color-text-faint)]">
      {msg}
    </div>
  );
}
