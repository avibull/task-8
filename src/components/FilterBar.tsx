import { useState } from "react";
import { useTags } from "@/contexts/TagsContext";
import { cn } from "@/lib/utils";

interface Props {
  active: string;
  onChange: (v: string) => void;
}

/** Horizontal scrolling chip bar of tag filters. */
export function FilterBar({ active, onChange }: Props) {
  const { tags } = useTags();
  const defaults = tags.filter((t) => t.is_default).sort((a, b) => a.name.localeCompare(b.name));
  const userTags = tags.filter((t) => t.is_user_tag).sort((a, b) => a.name.localeCompare(b.name));
  const custom = tags.filter((t) => !t.is_default && !t.is_user_tag).sort((a, b) => a.name.localeCompare(b.name));
  const all = ["all", ...defaults.map((t) => t.name), ...userTags.map((t) => t.name), ...custom.map((t) => t.name)];

  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-border bg-background px-3 py-2">
      {all.map((name) => {
        const isUser = name.startsWith("@");
        const isActive = active === name;
        return (
          <button
            key={name}
            onClick={() => onChange(name)}
            className={cn(
              "mono shrink-0 rounded-[3px] border px-2.5 py-1 text-[11px] uppercase tracking-wide transition-colors",
              isActive
                ? "border-accent-lime bg-accent-lime text-background"
                : "border-border bg-panel text-foreground hover:border-dim",
              !isActive && isUser && "text-accent-lime"
            )}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
