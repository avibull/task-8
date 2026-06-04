import { useEffect, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PickerItem {
  key: string;       // unique id
  label: string;     // primary display (e.g. "Alice")
  sub?: string;      // secondary (e.g. "@alice")
  disabled?: boolean;
}

interface Props {
  title: string;
  items: PickerItem[];
  selectedKeys: string[];
  onToggle: (key: string) => void;
  onClose: () => void;
  placeholder?: string;
}

/** Bottom sheet picker with search; multi-select stays open until closed. */
export function PickerSheet({ title, items, selectedKeys, onToggle, onClose, placeholder }: Props) {
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = items.filter((it) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return it.label.toLowerCase().includes(s) || (it.sub ?? "").toLowerCase().includes(s);
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="slide-up flex max-h-[80vh] flex-col rounded-t-[4px] border-t border-border bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="mono text-[10px] uppercase tracking-wider text-dim">{title}</span>
          <button onClick={onClose} className="text-dim"><X size={16} /></button>
        </div>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search size={14} className="text-dim" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder ?? "Search..."}
            className="mono flex-1 bg-transparent text-sm text-foreground placeholder:text-dim focus:outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="mono px-3 py-6 text-center text-xs text-dim">no matches</div>
          )}
          {filtered.map((it) => {
            const sel = selectedKeys.includes(it.key);
            return (
              <button
                key={it.key}
                disabled={it.disabled}
                onClick={() => onToggle(it.key)}
                className={cn(
                  "flex w-full items-center justify-between border-b border-border px-3 py-2.5 text-left",
                  "active:bg-panel-2 disabled:opacity-40",
                  sel && "bg-panel-2"
                )}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm">{it.label}</div>
                  {it.sub && <div className="mono truncate text-[10px] text-dim">{it.sub}</div>}
                </div>
                {sel && <Check size={16} className="shrink-0 text-accent-lime" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
