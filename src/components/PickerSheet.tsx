import { useEffect, useState } from "react";
import { Check, Search, Trash2, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PickerItem {
  key: string;
  label: string;
  sub?: string;
  disabled?: boolean;
  /** Hide the trash icon for this row even when canManage is true. */
  protected?: boolean;
}

interface Props {
  title: string;
  items: PickerItem[];
  selectedKeys: string[];
  onToggle: (key: string) => void;
  onClose: () => void;
  placeholder?: string;
  /** Show inline add input + per-row trash buttons. */
  canManage?: boolean;
  onAdd?: (name: string) => Promise<void> | void;
  onDelete?: (key: string) => Promise<void> | void;
  addPlaceholder?: string;
}

export function PickerSheet({
  title, items, selectedKeys, onToggle, onClose, placeholder,
  canManage = false, onAdd, onDelete, addPlaceholder = "+ New tag...",
}: Props) {
  const [q, setQ] = useState("");
  const [newName, setNewName] = useState("");
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

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

  const submitAdd = async () => {
    const v = newName.trim();
    if (!v || !onAdd) return;
    await onAdd(v);
    setNewName("");
  };

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
            const confirming = confirmKey === it.key;
            return (
              <div
                key={it.key}
                className={cn(
                  "flex items-center justify-between border-b border-border",
                  sel && "bg-panel-2"
                )}
              >
                <button
                  disabled={it.disabled}
                  onClick={() => onToggle(it.key)}
                  className="flex flex-1 items-center justify-between px-3 py-2.5 text-left active:bg-panel-2 disabled:opacity-40"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm">{it.label}</div>
                    {it.sub && <div className="mono truncate text-[10px] text-dim">{it.sub}</div>}
                  </div>
                  {sel && <Check size={16} className="shrink-0 text-accent-lime" />}
                </button>
                {canManage && onDelete && !it.protected && (
                  <div className="flex shrink-0 items-center pr-2">
                    {confirming ? (
                      <div className="mono flex items-center gap-1 text-[10px] uppercase">
                        <span className="text-dim">delete?</span>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await onDelete(it.key);
                            setConfirmKey(null);
                          }}
                          className="rounded-[3px] border border-[color:var(--p1)] px-1.5 py-0.5 text-[color:var(--p1)]"
                        >yes</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmKey(null); }}
                          className="rounded-[3px] border border-border px-1.5 py-0.5 text-dim"
                        >no</button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmKey(it.key); }}
                        className="rounded-[3px] p-1.5 text-dim hover:text-[color:var(--p1)]"
                        aria-label={`Delete ${it.label}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {canManage && onAdd && (
          <form
            onSubmit={(e) => { e.preventDefault(); submitAdd(); }}
            className="flex items-center gap-2 border-t border-border bg-panel-2 px-3 py-2"
          >
            <Plus size={14} className="text-dim" />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={addPlaceholder}
              className="mono flex-1 bg-transparent text-sm text-foreground placeholder:text-dim focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="mono rounded-[3px] bg-accent-lime px-3 py-1.5 text-[10px] font-bold uppercase text-background disabled:opacity-40"
            >Add</button>
          </form>
        )}
      </div>
    </div>
  );
}
