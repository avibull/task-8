import { useAuth } from "@/contexts/AuthContext";
import { useProfiles } from "@/lib/profilesCache";
import { PickerSheet } from "./PickerSheet";

interface Props {
  /** Currently selected @usernames (without the leading @). */
  selected: string[];
  /** Called when a username is toggled on/off. */
  onToggle: (username: string) => void;
  onClose: () => void;
  /** Hide self from the list (default true). */
  excludeSelf?: boolean;
  title?: string;
}

/** Reusable user picker — used in AddBar, drawer ASSIGN, and alert recipients. */
export function UserPicker({ selected, onToggle, onClose, excludeSelf = true, title = "ASSIGN USERS" }: Props) {
  const { profile } = useAuth();
  const { profiles, status, error, refresh } = useProfiles();

  const items = profiles
    .filter((p) => !excludeSelf || p.username !== profile?.username)
    .map((p) => ({ key: p.username, label: p.name, sub: `@${p.username}` }));

  // Surface loading / error states inline so a silent fetch failure isn't
  // indistinguishable from a genuinely empty directory.
  const placeholder =
    status === "loading" && profiles.length === 0
      ? "Loading users..."
      : status === "error"
        ? `Failed to load: ${error ?? "unknown error"} — tap to retry`
        : undefined;

  if (status === "error" && profiles.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
        <div
          className="slide-up flex max-h-[80vh] flex-col rounded-t-[4px] border-t border-border bg-panel"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-border px-3 py-2">
            <span className="mono text-[10px] uppercase tracking-wider text-dim">{title}</span>
          </div>
          <div className="space-y-3 p-4">
            <div className="mono text-xs text-[color:var(--p1)]">Failed to load users.</div>
            <div className="mono text-[11px] text-dim">{error}</div>
            <button
              onClick={refresh}
              className="mono rounded-[3px] border border-border bg-panel-2 px-3 py-2 text-[11px] uppercase"
            >Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PickerSheet
      title={title}
      placeholder={placeholder ?? "Search users..."}
      items={items}
      selectedKeys={selected}
      onToggle={onToggle}
      onClose={onClose}
    />
  );
}
