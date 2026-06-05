import { useAuth } from "@/contexts/AuthContext";
import { useTags } from "@/contexts/TagsContext";
import { canManageTags } from "@/lib/types";
import { PickerSheet } from "./PickerSheet";

interface Props {
  selected: string[];
  onToggle: (name: string) => void;
  onClose: () => void;
  title?: string;
}

/** Reusable tag picker. Inline add/delete for admins / tag editors. */
export function TagPicker({ selected, onToggle, onClose, title = "TAGS" }: Props) {
  const { tags, addCustom, remove } = useTags();
  const { profile } = useAuth();
  const canManage = canManageTags(profile);

  const items = tags
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => ({ key: t.name, label: t.name }));

  return (
    <PickerSheet
      title={title}
      placeholder="Search tags..."
      items={items}
      selectedKeys={selected}
      onToggle={onToggle}
      onClose={onClose}
      canManage={canManage}
      onAdd={canManage ? async (name) => { await addCustom(name); } : undefined}
      onDelete={canManage ? async (name) => {
        const t = tags.find((x) => x.name === name);
        if (t) await remove(t.id);
      } : undefined}
      addPlaceholder="+ New tag..."
    />
  );
}
