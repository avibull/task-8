import { useState } from "react";
import { Mic } from "lucide-react";

interface Props {
  onAdd: (text: string) => void;
}

export function AddBar({ onAdd }: Props) {
  const [val, setVal] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!val.trim()) return;
        onAdd(val);
        setVal("");
      }}
      className="flex items-center gap-2 border-b border-border bg-panel px-3 py-2"
    >
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="+ Add task or tap mic..."
        className="mono flex-1 rounded-[3px] border border-border bg-panel-2 px-3 py-2 text-sm text-foreground placeholder:text-dim focus:border-accent-lime focus:outline-none"
      />
      <button
        type="button"
        disabled
        title="Voice — coming soon"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-lime text-background opacity-60"
      >
        <Mic size={16} />
      </button>
    </form>
  );
}
