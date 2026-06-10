import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronRight, Trash2, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerOverlay, DrawerPortal } from "@/components/ui/drawer";
import { useAuth } from "@/contexts/AuthContext";
import { useTags } from "@/contexts/TagsContext";
import { changePin } from "@/lib/bootstrap.functions";
import { canManageTags, canManageUsers } from "@/lib/types";
import { AdminPanel } from "@/components/AdminPanel";
import { ActivityLog } from "@/components/ActivityLog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — task8" },
      {
        name: "description",
        content:
          "Manage your task8 account: change PIN, switch theme, manage tags, and administer users.",
      },
      { property: "og:title", content: "Settings — task8" },
      {
        property: "og:description",
        content: "Manage your task8 account and team settings.",
      },
      { property: "og:url", content: "https://turbo-task.lovable.app/settings" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

type Sheet = null | "pin" | "display" | "tags";

function SettingsPage() {
  const nav = useNavigate();
  const { profile, loading, signOut } = useAuth();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  useEffect(() => {
    if (!loading && !profile) nav({ to: "/login", replace: true });
  }, [loading, profile, nav]);

  if (!profile) return null;

  const showTags = canManageTags(profile);
  const showAdmin = canManageUsers(profile);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-panel px-4 py-3">
        <Link to="/tasks" aria-label="Back to tasks" className="text-dim"><ArrowLeft size={18} /></Link>
        <h1 className="mono text-sm uppercase tracking-wider">settings</h1>
      </header>

      <div className="p-3">
        <div className="mono mb-3 rounded-[3px] border border-border bg-panel p-3 text-[11px] space-y-1">
          <div><span className="text-dim">name · </span>{profile.name}</div>
          <div><span className="text-dim">id · </span>{profile.employee_id}</div>
          <div><span className="text-dim">user · </span>@{profile.username}</div>
          <div className="flex gap-1 pt-0.5">
            {profile.is_admin && <span className="rounded-[3px] border border-accent-lime bg-accent-lime/15 px-1.5 py-0.5 text-[9px] uppercase text-accent-lime">admin</span>}
            {profile.can_edit_tags && <span className="rounded-[3px] border border-[#3b82f6] bg-[#3b82f6]/15 px-1.5 py-0.5 text-[9px] uppercase text-[#3b82f6]">tags</span>}
          </div>
        </div>

        <div className="space-y-2">
          <Row label="Change PIN" onClick={() => setSheet("pin")} />
          <Row label="Display" onClick={() => setSheet("display")} />
          {showTags && <Row label="Tag management" onClick={() => setSheet("tags")} />}
          {showAdmin && <Row label="Manage users" onClick={() => setAdminOpen(true)} />}
          <Row label="Activity" onClick={() => setActivityOpen(true)} />
        </div>

        <button
          onClick={async () => { await signOut(); nav({ to: "/login", replace: true }); }}
          className="mono mt-6 w-full rounded-[3px] border border-[color:var(--p1)] bg-panel px-3 py-3 text-xs uppercase text-[color:var(--p1)]"
        >Sign out</button>
      </div>

      <SheetWrap open={sheet === "pin"} onClose={() => setSheet(null)} heightVh={50} title="Change PIN">
        <PinForm onDone={() => setSheet(null)} />
      </SheetWrap>

      <SheetWrap open={sheet === "display"} onClose={() => setSheet(null)} heightVh={35} title="Display">
        <DisplayForm />
      </SheetWrap>

      <SheetWrap open={sheet === "tags"} onClose={() => setSheet(null)} heightVh={70} title="Tag management">
        <TagManager />
      </SheetWrap>

      {adminOpen && (
        <div className="fixed inset-0 z-50 animate-in fade-in slide-in-from-right-4 bg-background">
          <AdminPanel onClose={() => setAdminOpen(false)} />
        </div>
      )}
    </div>
  );
}

function Row({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mono flex w-full items-center justify-between rounded-[3px] border border-border bg-panel px-4 py-4 text-sm uppercase tracking-wider hover:border-accent-lime active:bg-panel-2"
    >
      <span>{label}</span>
      <ChevronRight size={16} className="text-dim" />
    </button>
  );
}

function SheetWrap({
  open, onClose, heightVh, title, children,
}: { open: boolean; onClose: () => void; heightVh: number; title: string; children: ReactNode }) {
  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerPortal>
        <DrawerOverlay />
        <DrawerContent
          className="border-border bg-panel"
          style={{ height: `${heightVh}vh` }}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="mono text-[10px] uppercase tracking-wider text-dim">{title}</span>
            <button onClick={onClose} aria-label="Close" className="text-dim"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-hidden">{children}</div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}

function PinForm({ onDone }: { onDone: () => void }) {
  const { profile } = useAuth();
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const submit = async () => {
    if (!profile) return;
    if (newPin.length < 4) return toast.error("PIN must be 4–6 digits");
    if (newPin !== confirmPin) return toast.error("PINs don't match");
    const res = await changePin({ data: { user_id: profile.id, old_pin: oldPin, new_pin: newPin } });
    if (!res.ok) return toast.error(res.message);
    toast.success("PIN updated");
    setOldPin(""); setNewPin(""); setConfirmPin("");
    onDone();
  };

  return (
    <div className="space-y-2 p-4">
      <PinInput value={oldPin} onChange={setOldPin} placeholder="Old PIN" />
      <PinInput value={newPin} onChange={setNewPin} placeholder="New PIN" />
      <PinInput value={confirmPin} onChange={setConfirmPin} placeholder="Confirm new PIN" />
      <button
        onClick={submit}
        className="mono w-full rounded-[3px] bg-accent-lime px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-background"
      >Save</button>
    </div>
  );
}

function DisplayForm() {
  const [theme, setTheme] = useState<"dark" | "light">(
    typeof window !== "undefined" && localStorage.getItem("tt_theme") === "light" ? "light" : "dark"
  );
  const applyTheme = (t: "dark" | "light") => {
    setTheme(t);
    localStorage.setItem("tt_theme", t);
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(t);
  };
  return (
    <div className="p-4">
      <div className="mono mb-2 text-[10px] uppercase tracking-wider text-dim">Theme</div>
      <div className="grid grid-cols-2 gap-2">
        {(["dark", "light"] as const).map((t) => (
          <button
            key={t}
            onClick={() => applyTheme(t)}
            className={cn(
              "mono rounded-[3px] border px-3 py-3 text-xs uppercase",
              theme === t ? "border-accent-lime bg-accent-lime text-background" : "border-border bg-panel-2"
            )}
          >{t}</button>
        ))}
      </div>
    </div>
  );
}

function TagManager() {
  const { tags, addCustom, remove } = useTags();
  const [newTag, setNewTag] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 border-b border-border p-3">
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="+ New tag"
          className="mono flex-1 rounded-[3px] border border-border bg-panel-2 px-3 py-2 text-xs"
        />
        <button
          onClick={async () => { await addCustom(newTag); setNewTag(""); }}
          className="mono rounded-[3px] bg-accent-lime px-3 py-2 text-xs font-bold uppercase text-background"
        >Add</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {tags.length === 0 && <div className="mono text-[11px] text-dim">none yet</div>}
        <div className="space-y-1">
          {tags.map((t) => (
            <div key={t.id} className="mono flex items-center justify-between rounded-[3px] border border-border bg-panel-2 px-3 py-2 text-xs">
              <span>#{t.name}</span>
              {confirmId === t.id ? (
                <div className="flex gap-1">
                  <button onClick={() => { remove(t.id); setConfirmId(null); }} className="mono rounded-[3px] bg-[color:var(--p1)] px-2 py-1 text-[10px] uppercase text-background">Delete</button>
                  <button onClick={() => setConfirmId(null)} className="mono rounded-[3px] border border-border px-2 py-1 text-[10px] uppercase text-dim">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmId(t.id)} aria-label={`Delete tag ${t.name}`} className="text-[color:var(--p1)]"><Trash2 size={14} /></button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PinInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      type="password"
      inputMode="numeric"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      placeholder={placeholder}
      className="mono w-full rounded-[3px] border border-border bg-panel-2 px-3 py-2.5 text-xs tracking-[0.3em]"
    />
  );
}
