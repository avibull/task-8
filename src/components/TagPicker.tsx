import { useTags } from "@/contexts/TagsContext";
import { PickerSheet } from "./PickerSheet";

interface Props {
  /** Currently selected tag names (non-@). */
  selected: string[];
  onToggle: (name: string) => void;
  onClose: () => void;
  title?: string;
}

/** Reusable tag picker (non-user tags only). */
export function TagPicker({ selected, onToggle, onClose, title = "TAGS" }: Props) {
  const { tags } = useTags();
  const items = tags
    .filter((t) => !t.is_user_tag)
    .sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map((t) => ({ key: t.name, label: t.name, sub: t.is_default ? "default" : "custom" }));

  return (
    <PickerSheet
      title={title}
      placeholder="Search tags..."
      items={items}
      selectedKeys={selected}
      onToggle={onToggle}
      onClose={onClose}
    />
  );
}
