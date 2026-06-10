import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortKey =
  | "priority_desc"
  | "priority_asc"
  | "date_desc"
  | "date_asc"
  | "az"
  | "za";

export const SORT_LABELS: Record<SortKey, string> = {
  priority_desc: "Priority ↓",
  priority_asc: "Priority ↑",
  date_desc: "Date added ↓",
  date_asc: "Date added ↑",
  az: "A → Z",
  za: "Z → A",
};

const ORDER: SortKey[] = ["priority_desc", "priority_asc", "date_desc", "date_asc", "az", "za"];

export function SortControl({ value, onChange }: { value: SortKey; onChange: (s: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative flex items-center justify-end border-b border-border bg-background px-3 py-1.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="mono rounded-[3px] border border-border bg-panel px-2 py-1 text-[10px] uppercase tracking-wide text-foreground hover:border-dim"
      >
        Sort: {SORT_LABELS[value]}
      </button>
      {open && (
        <div className="absolute right-3 top-full z-30 mt-1 w-44 rounded-[3px] border border-border bg-panel shadow-lg">
          {ORDER.map((k) => (
            <button
              key={k}
              onClick={() => { onChange(k); setOpen(false); }}
              className={cn(
                "mono flex w-full items-center justify-between px-2.5 py-2 text-left text-[11px] uppercase tracking-wide hover:bg-panel-2",
                value === k && "text-accent-lime"
              )}
            >
              <span>{SORT_LABELS[k]}</span>
              {value === k && <Check size={12} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
