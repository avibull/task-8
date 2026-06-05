import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTags } from "@/contexts/TagsContext";
import { changePin } from "@/lib/bootstrap.functions";
import { canManageTags, canManageUsers } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const nav = useNavigate();
  const { profile, loading, signOut } = useAuth();
  const { tags, addCustom, remove } = useTags();
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [newTag, setNewTag] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">(
    typeof window !== "undefined" && localStorage.getItem("tt_theme") === "light" ? "light" : "dark"
  );

  useEffect(() => {
    if (!loading && !profile) nav({ to: "/login", replace: true });
  }, [loading, profile, nav]);

  const applyTheme = (t: "dark" | "light") => {
    setTheme(t);
    localStorage.setItem("tt_theme", t);
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(t);
  };

  const submitPin = async () => {
    if (!profile) return;
    if (newPin.length < 4) return toast.error("PIN must be 4–6 digits");
    if (newPin !== confirmPin) return toast.error("PINs don't match");
    const res = await changePin({ data: { user_id: profile.id, old_pin: oldPin, new_pin: newPin } });
    if (!res.ok) return toast.error(res.message);
    toast.success("PIN updated");
    setOldPin(""); setNewPin(""); setConfirmPin("");
  };

  if (!profile) return null;

  const showTags = canManageTags(profile);
  const showAdmin = canManageUsers(profile);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-panel px-4 py-3">
        <Link to="/tasks" className="text-dim"><ArrowLeft size={18} /></Link>
        <h1 className="mono text-sm uppercase tracking-wider">settings</h1>
      </header>

      <div className="space-y-6 p-4">
        <Section title="Account">
          <div className="mono space-y-1 rounded-[3px] border border-border bg-panel p-3 text-xs">
            <div><span className="text-dim">name · </span>{profile.name}</div>
            <div><span className="text-dim">id · </span>{profile.employee_id}</div>
            <div><span className="text-dim">user · </span>@{profile.username}</div>
            <div><span className="text-dim">phone · </span>{profile.phone}</div>
            <div className="flex gap-1 pt-0.5">
              {profile.is_admin && <span className="rounded-[3px] border border-accent-lime bg-accent-lime/15 px-1.5 py-0.5 text-[9px] uppercase text-accent-lime">admin</span>}
              {profile.can_edit_tags && <span className="rounded-[3px] border border-[#3b82f6] bg-[#3b82f6]/15 px-1.5 py-0.5 text-[9px] uppercase text-[#3b82f6]">tags</span>}
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <PinInput value={oldPin} onChange={setOldPin} placeholder="Old PIN" />
            <PinInput value={newPin} onChange={setNewPin} placeholder="New PIN" />
            <PinInput value={confirmPin} onChange={setConfirmPin} placeholder="Confirm new PIN" />
            <button
              onClick={submitPin}
              className="mono w-full rounded-[3px] bg-accent-lime px-3 py-2 text-xs font-bold uppercase tracking-wider text-background"
            >Change PIN</button>
          </div>
        </Section>

        <Section title="Appearance">
          <div className="grid grid-cols-2 gap-2">
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                onClick={() => applyTheme(t)}
                className={cn(
                  "mono rounded-[3px] border px-3 py-2 text-xs uppercase",
                  theme === t ? "border-accent-lime bg-accent-lime text-background" : "border-border bg-panel"
                )}
              >{t}</button>
            ))}
          </div>
        </Section>

        {showTags && (
          <Section title="Tags">
            <div className="mb-2 flex gap-2">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="new-tag"
                className="mono flex-1 rounded-[3px] border border-border bg-panel px-3 py-2 text-xs"
              />
              <button
                onClick={async () => { await addCustom(newTag); setNewTag(""); }}
                className="mono rounded-[3px] bg-accent-lime px-3 py-2 text-xs font-bold uppercase text-background"
              >Add</button>
            </div>
            {tags.length === 0 && <div className="mono text-[11px] text-dim">none yet</div>}
            <div className="space-y-1">
              {tags.map((t) => (
                <div key={t.id} className="mono flex items-center justify-between rounded-[3px] border border-border bg-panel px-3 py-2 text-xs">
                  <span>{t.name}</span>
                  <button onClick={() => remove(t.id)} className="text-[color:var(--p1)]"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </Section>
        )}

        {showAdmin && (
          <Section title="Admin">
            <Link
              to="/admin"
              className="mono block w-full rounded-[3px] border border-accent-lime bg-panel px-3 py-2 text-center text-xs uppercase text-accent-lime"
            >
              Manage users
            </Link>
          </Section>
        )}

        <button
          onClick={async () => { await signOut(); nav({ to: "/login", replace: true }); }}
          className="mono w-full rounded-[3px] border border-[color:var(--p1)] bg-panel px-3 py-2 text-xs uppercase text-[color:var(--p1)]"
        >Sign out</button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mono mb-2 text-[10px] uppercase tracking-wider text-dim">{title}</h2>
      {children}
    </section>
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
      className="mono w-full rounded-[3px] border border-border bg-panel px-3 py-2 text-xs tracking-[0.3em]"
    />
  );
}
