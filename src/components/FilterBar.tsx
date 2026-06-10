import { useTags } from "@/contexts/TagsContext";
import { cn } from "@/lib/utils";

export type Scope = "mine" | "delegated" | "all";

interface Props {
  scope: Scope;
  onScope: (s: Scope) => void;
  tag: string | null;
  onTag: (t: string | null) => void;
}

/** Combined scope + tag filter bar — single horizontal row, scrollable. */
export function FilterBar({ scope, onScope, tag, onTag }: Props) {
  const { tags } = useTags();
  const defaults = tags.filter((t) => t.is_default).sort((a, b) => a.name.localeCompare(b.name));
  const custom = tags.filter((t) => !t.is_default).sort((a, b) => a.name.localeCompare(b.name));
  const tagNames = [...defaults.map((t) => t.name), ...custom.map((t) => t.name)];

  const scopes: { key: Scope; label: string }[] = [
    { key: "mine", label: "Mine" },
    { key: "delegated", label: "Assigned" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-border bg-background px-3 py-2">
      {scopes.map((s) => {
        const active = scope === s.key;
        return (
          <button
            key={s.key}
            onClick={() => onScope(s.key)}
            className={cn(
              "mono shrink-0 rounded-[3px] border px-2.5 py-1 text-[11px] uppercase tracking-wide transition-colors",
              active
                ? "border-accent-lime bg-accent-lime text-background"
                : "border-border bg-panel text-foreground hover:border-dim"
            )}
          >
            {s.label}
          </button>
        );
      })}
      <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
      {tagNames.map((name) => {
        const active = tag === name;
        return (
          <button
            key={name}
            onClick={() => onTag(active ? null : name)}
            className={cn(
              "mono shrink-0 rounded-[3px] border px-2.5 py-1 text-[11px] uppercase tracking-wide transition-colors",
              active
                ? "border-accent-lime bg-accent-lime text-background"
                : "border-border bg-panel text-foreground hover:border-dim"
            )}
          >
            #{name}
          </button>
        );
      })}
    </div>
  );
}
