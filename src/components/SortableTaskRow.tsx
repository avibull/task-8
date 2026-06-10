import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskRow } from "./TaskRow";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type TaskRowProps = ComponentProps<typeof TaskRow>;

export function SortableTaskRow(props: TaskRowProps) {
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
      {...attributes}
      {...listeners}
      className={cn(
        "relative touch-manipulation",
        isDragging && "scale-[1.01] shadow-lg shadow-black/40 bg-panel-2"
      )}
    >
      {isDragging && (
        <div className="pointer-events-none absolute left-0 top-1/2 z-10 -translate-y-1/2 pl-1 text-accent-lime">
          <GripVertical size={14} />
        </div>
      )}
      <TaskRow {...props} />
    </div>
  );
}
