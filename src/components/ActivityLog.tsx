import { useEffect, useState } from "react";
import { X, Plus, Check, Trash2, Send, BellRing } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fetchActivity, type ActivityLogRow } from "@/lib/activity";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  /** Called when the user taps an entry tied to a still-existing task. */
  onOpenTask: (taskId: string) => void;
}

const PAGE = 10;

export function ActivityLog({ onClose, onOpenTask }: Props) {
  const [rows, setRows] = useState<ActivityLogRow[] | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    (async () => {
      const first = await fetchActivity(null, PAGE);
      setRows(first);
      setHasMore(first.length === PAGE);
    })();
  }, []);

  const loadMore = async () => {
    if (!rows || rows.length === 0) return;
    setLoadingMore(true);
    const next = await fetchActivity(rows[rows.length - 1].created_at, PAGE);
    setRows([...rows, ...next]);
    setHasMore(next.length === PAGE);
    setLoadingMore(false);
  };

  return (
    <div className="slide-in-right fixed inset-0 z-50 flex flex-col bg-[color:var(--color-base)]">
      <header className="flex items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-base)] px-4 py-3">
        <h2 className="mono text-sm uppercase tracking-wider">activity</h2>
        <button
          onClick={onClose}
          aria-label="Close activity log"
          className="flex h-11 w-11 items-center justify-center text-[color:var(--color-text-dim)]"
        >
          <X size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {rows === null && <ActivitySkeleton count={5} />}

        {rows !== null && rows.length === 0 && (
          <div className="mono p-10 text-center text-[11px] uppercase tracking-wider text-[color:var(--color-text-faint)]">
            No activity yet.
          </div>
        )}

        {rows?.map((r) => (
          <ActivityRow key={r.id} row={r} onOpenTask={onOpenTask} />
        ))}

        {rows && rows.length > 0 && (
          <div className="py-6 text-center">
            {hasMore ? (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="mono text-[11px] uppercase tracking-wider text-[color:var(--color-text-dim)] disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            ) : (
              <div className="mono text-[11px] uppercase tracking-wider text-[color:var(--color-text-faint)]">
                You've reached the beginning
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityRow({
  row,
  onOpenTask,
}: {
  row: ActivityLogRow;
  onOpenTask: (id: string) => void;
}) {
  const meta = (row.meta || {}) as {
    task_text?: string;
    recipient?: string;
    sender?: string;
    alert_type?: string;
  };
  const taskText = meta.task_text;
  const when = formatDistanceToNow(new Date(row.created_at), { addSuffix: true });

  const { icon, line } = describe(row.event_type, meta);

  const interactive = !!row.task_id;
  const Wrap = interactive ? "button" : "div";

  return (
    <Wrap
      onClick={interactive ? () => onOpenTask(row.task_id as string) : undefined}
      className={cn(
        "flex w-full items-start gap-3 border-b border-[color:var(--color-border)] px-4 py-3 text-left",
        interactive && "active:bg-[color:var(--color-surface)]"
      )}
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] leading-snug">{line}</div>
        {taskText && row.event_type !== "task_created" && row.event_type !== "task_completed" && row.event_type !== "task_deleted" && (
          <div className="mono mt-0.5 truncate text-[11px] text-[color:var(--color-text-dim)]">
            {taskText}
          </div>
        )}
      </div>
      <div className="mono shrink-0 pl-2 text-[10px] uppercase text-[color:var(--color-text-dim)]">{when}</div>
    </Wrap>
  );
}

function describe(
  type: ActivityLogRow["event_type"],
  meta: { task_text?: string; recipient?: string; sender?: string; alert_type?: string }
): { icon: JSX.Element; line: JSX.Element } {
  const t = meta.task_text ?? "(untitled)";
  switch (type) {
    case "task_created":
      return {
        icon: <Plus size={14} className="text-[color:var(--color-accent)]" />,
        line: <>You created <Quoted>{t}</Quoted></>,
      };
    case "task_completed":
      return {
        icon: <Check size={14} className="text-[color:var(--color-ok)]" />,
        line: <>You completed <Quoted>{t}</Quoted></>,
      };
    case "task_deleted":
      return {
        icon: <Trash2 size={13} className="text-[color:var(--color-text-dim)]" />,
        line: <>You deleted <Quoted>{t}</Quoted></>,
      };
    case "alert_sent":
      return {
        icon: <Send size={13} className="text-[color:var(--color-accent)]" />,
        line: (
          <>
            You alerted <span className="text-[color:var(--color-accent)]">@{meta.recipient}</span>
            {" — "}
            <Quoted>{t}</Quoted>
          </>
        ),
      };
    case "alert_acknowledged":
      return {
        icon: <BellRing size={13} className="text-[color:var(--color-ok)]" />,
        line: (
          <>
            You acknowledged <span className="text-[color:var(--color-accent)]">@{meta.sender}</span>'s alert
            {" — "}
            <Quoted>{t}</Quoted>
          </>
        ),
      };
  }
}

function Quoted({ children }: { children: React.ReactNode }) {
  return <span className="text-[color:var(--color-text)]">"{children}"</span>;
}

export function ActivitySkeleton({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-[color:var(--color-border)] px-4 py-3">
          <div className="skeleton h-7 w-7 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3 w-3/4" />
            <div className="skeleton h-2.5 w-1/3" />
          </div>
          <div className="skeleton h-2.5 w-10" />
        </div>
      ))}
    </div>
  );
}
