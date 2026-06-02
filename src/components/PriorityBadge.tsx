import type { Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

const map: Record<Priority, { label: string; cls: string }> = {
  P1: { label: "P1", cls: "bg-[color:var(--p1)] text-background" },
  P2: { label: "P2", cls: "bg-[color:var(--p2)] text-background" },
  P3: { label: "P3", cls: "bg-[color:var(--p3)] text-background" },
  Daily: { label: "D", cls: "bg-[color:var(--daily)] text-background" },
  None: { label: "—", cls: "bg-panel-2 text-dim" },
};

export function PriorityBadge({ p }: { p: Priority }) {
  const m = map[p];
  return (
    <span
      className={cn(
        "mono inline-flex h-5 min-w-5 items-center justify-center rounded-[3px] px-1 text-[10px] font-bold uppercase",
        m.cls
      )}
    >
      {m.label}
    </span>
  );
}
