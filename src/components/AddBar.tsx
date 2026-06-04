import { useState } from "react";
import { Mic, UserPlus, Tag as TagIcon, X, Send } from "lucide-react";
import { UserPicker } from "./UserPicker";
import { TagPicker } from "./TagPicker";
import { cn } from "@/lib/utils";

interface Props {
  onAdd: (text: string, tags: string[]) => void;
}

export function AddBar({ onAdd }: Props) {
  const [val, setVal] = useState("");
  const [users, setUsers] = useState<string[]>([]);     // @-less usernames
  const [tags, setTags] = useState<string[]>([]);       // non-@ tag names
  const [showUsers, setShowUsers] = useState(false);
  const [showTags, setShowTags] = useState(false);

  const submit = () => {
    if (!val.trim()) return;
    const final = [...users.map((u) => `@${u}`), ...tags];
    onAdd(val, final.length ? final : ["today"]);
    setVal("");
    setUsers([]);
    setTags([]);
  };

  const chips = [
    ...users.map((u) => ({ key: `u:${u}`, label: `@${u}`, accent: true, remove: () => setUsers((s) => s.filter((x) => x !== u)) })),
    ...tags.map((t) => ({ key: `t:${t}`, label: t, accent: false, remove: () => setTags((s) => s.filter((x) => x !== t)) })),
  ];

  return (
    <div className="border-b border-border bg-panel">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2">
          {chips.map((c) => (
            <span
              key={c.key}
              className={cn(
                "mono inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[10px]",
                c.accent ? "border-accent-lime text-accent-lime" : "border-border text-foreground"
              )}
            >
              {c.label}
              <button onClick={c.remove} className="text-dim hover:text-foreground"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="flex items-center gap-1.5 px-3 py-2"
      >
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="+ Add task or tap mic..."
          className="mono flex-1 rounded-[3px] border border-border bg-panel-2 px-3 py-2 text-sm text-foreground placeholder:text-dim focus:border-accent-lime focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShowUsers(true)}
          title="Assign users"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border border-border bg-panel-2 text-foreground hover:border-accent-lime"
        >
          <UserPlus size={15} />
        </button>
        <button
          type="button"
          onClick={() => setShowTags(true)}
          title="Add tags"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border border-border bg-panel-2 text-foreground hover:border-accent-lime"
        >
          <TagIcon size={15} />
        </button>
        {val.trim() ? (
          <button
            type="submit"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-lime text-background"
            title="Add"
          >
            <Send size={15} />
          </button>
        ) : (
          <button
            type="button"
            disabled
            title="Voice — coming soon"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-lime text-background opacity-60"
          >
            <Mic size={15} />
          </button>
        )}
      </form>

      {showUsers && (
        <UserPicker
          title="ASSIGN USERS"
          selected={users}
          onToggle={(u) => setUsers((s) => (s.includes(u) ? s.filter((x) => x !== u) : [...s, u]))}
          onClose={() => setShowUsers(false)}
        />
      )}
      {showTags && (
        <TagPicker
          title="ADD TAGS"
          selected={tags}
          onToggle={(t) => setTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))}
          onClose={() => setShowTags(false)}
        />
      )}
    </div>
  );
}
