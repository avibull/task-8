import { useSyncExternalStore } from "react";
import { CloudOff, CloudCheck, RefreshCw } from "lucide-react";
import { store, manualSync } from "@/lib/localdb";
import { cn } from "@/lib/utils";

/**
 * Small status pill: shows online/offline state and pending op count.
 * Tap to force a sync attempt.
 */
export function SyncStatus({ className }: { className?: string }) {
  const snap = useSyncExternalStore(store.subscribe, store.get, store.get);
  const pending = snap.pending.length;
  const conn = snap.conn;

  let label: string;
  let Icon = CloudCheck;
  let tone = "text-dim";
  if (conn === "offline") {
    Icon = CloudOff;
    tone = "text-[color:var(--p2)]";
    label = pending > 0 ? `offline · ${pending}` : "offline";
  } else if (conn === "syncing" || pending > 0) {
    Icon = RefreshCw;
    tone = "text-accent-lime";
    label = pending > 0 ? `sync · ${pending}` : "sync";
  } else {
    label = "synced";
  }

  return (
    <button
      type="button"
      onClick={() => manualSync()}
      aria-label="Sync status — tap to retry"
      className={cn(
        "mono inline-flex items-center gap-1 rounded-[3px] border border-border bg-panel px-1.5 py-0.5 text-[9px] uppercase tracking-wider",
        tone,
        className,
      )}
    >
      <Icon
        size={10}
        className={cn(conn === "syncing" && "animate-spin")}
        aria-hidden="true"
      />
      <span>{label}</span>
    </button>
  );
}
