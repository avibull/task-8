import { useState } from "react";
import { Mic, UserPlus, Tag as TagIcon, X, Send } from "lucide-react";
import { UserPicker } from "./UserPicker";
import { TagPicker } from "./TagPicker";
import { cn } from "@/lib/utils";

interface Props {
  onAdd: (text: string, tags: string[], assigned_to: string[]) => void;
}

export function AddBar({ onAdd }: Props) {
  const [val, setVal] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]); // @-less usernames
  const [tags, setTags] = useState<string[]>([]);
  const [showUsers, setShowUsers] = useState(false);
  const [showTags, setShowTags] = useState(false);

  const submit = () => {
    if (!val.trim()) return;
    onAdd(val, tags, assignees);
    setVal("");
    setAssignees([]);
    setTags([]);
  };

  return (
    <div className="border-b border-border bg-panel">
      {(assignees.length > 0 || tags.length > 0) && (
        <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2">
          {assignees.map((u) => (
            <span
              key={`u:${u}`}
              className="mono inline-flex items-center gap-1 rounded-[3px] border border-accent-lime/60 bg-panel-2 px-1.5 py-0.5 text-[10px] text-accent-lime"
            >
              @{u}
              <button
                onClick={() => setAssignees((s) => s.filter((x) => x !== u))}
                className="text-dim hover:text-foreground"
              ><X size={10} /></button>
            </span>
          ))}
          {tags.map((t) => (
            <span
              key={`t:${t}`}
              className="mono inline-flex items-center gap-1 rounded-[3px] border border-border px-1.5 py-0.5 text-[10px] text-foreground"
            >
              #{t}
              <button
                onClick={() => setTags((s) => s.filter((x) => x !== t))}
                className="text-dim hover:text-foreground"
              ><X size={10} /></button>
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
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border bg-panel-2 hover:border-accent-lime",
            assignees.length > 0 ? "border-accent-lime text-accent-lime" : "border-border text-foreground"
          )}
        >
          <UserPlus size={15} />
        </button>
        <button
          type="button"
          onClick={() => setShowTags(true)}
          title="Add tags"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border bg-panel-2 hover:border-accent-lime",
            tags.length > 0 ? "border-accent-lime text-accent-lime" : "border-border text-foreground"
          )}
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
          selected={assignees}
          onToggle={(u) => setAssignees((s) => (s.includes(u) ? s.filter((x) => x !== u) : [...s, u]))}
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
