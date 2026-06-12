import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskRow } from "./TaskRow";
import { memo, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

type TaskRowProps = ComponentProps<typeof TaskRow>;

export const SortableTaskRow = memo(function SortableTaskRow(props: TaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.task.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: "relative",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative",
        isDragging && "scale-[1.01] shadow-lg shadow-black/40 bg-panel-2"
      )}
    >
      {/* Drag handle — only this element owns the dnd pointer gesture.
          The rest of the row keeps native click semantics so tap-to-expand
          fires immediately and is never swallowed by dnd-kit. */}
      <button
        type="button"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 z-10 flex h-full w-6 items-center justify-center text-dim/60 active:text-accent-lime"
        style={{ touchAction: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={12} />
      </button>
      <div className="pl-5">
        <TaskRow {...props} />
      </div>
    </div>
  );
});
