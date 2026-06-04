import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { listUsers, createUser, updateUser, deleteUser } from "@/lib/admin.functions";
import type { Profile, UserRole } from "@/lib/types";
import { canManageUsers } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({ component: AdminPage });

const ROLES: UserRole[] = ["regular", "manager", "admin"];

function AdminPage() {
  const nav = useNavigate();
  const { profile, loading } = useAuth();
  const listFn = useServerFn(listUsers);
  const createFn = useServerFn(createUser);
  const updateFn = useServerFn(updateUser);
  const deleteFn = useServerFn(deleteUser);

  const [users, setUsers] = useState<Profile[]>([]);
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);

  const refresh = async () => {
    try {
      const res = await listFn({ data: undefined as never });
      setUsers((res.users ?? []) as Profile[]);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  useEffect(() => {
    if (!loading && !profile) nav({ to: "/login", replace: true });
    if (!loading && profile && !canManageUsers(profile.role)) nav({ to: "/tasks", replace: true });
  }, [loading, profile, nav]);

  useEffect(() => {
    if (profile && canManageUsers(profile.role)) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  if (!profile || !canManageUsers(profile.role)) return null;

  const handleDelete = async (u: Profile) => {
    if (u.id === profile.id) return toast.error("Can't delete yourself");
    if (!confirm(`Delete ${u.name} (${u.employee_id})?`)) return;
    setBusy(true);
    const res = await deleteFn({ data: { id: u.id } });
    setBusy(false);
    if (!res.ok) return toast.error(res.message);
    toast.success("User deleted");
    refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border bg-panel px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="text-dim"><ArrowLeft size={18} /></Link>
          <h1 className="mono text-sm uppercase tracking-wider">admin · users</h1>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="mono flex items-center gap-1 rounded-[3px] bg-accent-lime px-2.5 py-1.5 text-[10px] font-bold uppercase text-background"
        >
          <Plus size={12} /> New user
        </button>
      </header>

      <div className="p-3">
        <div className="overflow-hidden rounded-[3px] border border-border bg-panel">
          <table className="mono w-full text-left text-xs">
            <thead className="bg-panel-2 text-[10px] uppercase tracking-wider text-dim">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-3 py-2">{u.employee_id}</td>
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2 text-accent-lime">@{u.username}</td>
                  <td className="px-3 py-2"><RoleBadge role={u.role} /></td>
                  <td className="px-3 py-2">{u.is_active ? "yes" : "no"}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(u)} className="rounded-[3px] border border-border p-1.5 text-dim hover:text-foreground">
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={busy || u.id === profile.id}
                        className="rounded-[3px] border border-border p-1.5 text-dim hover:text-[color:var(--p1)] disabled:opacity-30"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-dim">no users</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <UserModal
          onClose={() => setShowAdd(false)}
          onSubmit={async (data) => {
            const res = await createFn({ data: data as Parameters<typeof createFn>[0]["data"] });
            if (!res.ok) { toast.error(res.message); return false; }
            toast.success("User created");
            await refresh();
            return true;
          }}
        />
      )}

      {editing && (
        <UserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (data) => {
            const res = await updateFn({ data: {
              id: editing.id,
              name: data.name,
              phone: data.phone,
              role: data.role,
              new_pin: data.pin || undefined,
            } });
            if (!res.ok) { toast.error(res.message); return false; }
            toast.success("User updated");
            await refresh();
            return true;
          }}
        />
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    regular: "border-border bg-panel-2 text-dim",
    manager: "border-[#3b82f6] bg-[#3b82f6]/15 text-[#3b82f6]",
    admin: "border-accent-lime bg-accent-lime/15 text-accent-lime",
  };
  return (
    <span className={cn("mono rounded-[3px] border px-1.5 py-0.5 text-[10px] uppercase", styles[role])}>
      {role}
    </span>
  );
}

interface UserModalProps {
  user?: Profile;
  onClose: () => void;
  onSubmit: (data: {
    employee_id: string; name: string; username: string; phone: string;
    pin: string; role: UserRole;
  }) => Promise<boolean>;
}

function UserModal({ user, onClose, onSubmit }: UserModalProps) {
  const isEdit = !!user;
  const [employee_id, setEid] = useState(user?.employee_id ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<UserRole>(user?.role ?? "regular");
  const [busy, setBusy] = useState(false);

  const valid = useMemo(() => {
    if (!name.trim() || !phone.trim()) return false;
    if (!isEdit && (!employee_id.trim() || !username.trim() || pin.length < 4)) return false;
    return true;
  }, [name, phone, employee_id, username, pin, isEdit]);

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    const ok = await onSubmit({ employee_id, name, username, phone, pin, role });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="slide-up w-full max-w-md rounded-t-[4px] border border-border bg-panel sm:rounded-[4px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="mono text-[10px] uppercase tracking-wider text-dim">
            {isEdit ? `Edit user · ${user!.employee_id}` : "New user"}
          </span>
          <button onClick={onClose} className="text-dim"><X size={16} /></button>
        </div>
        <div className="space-y-2 p-3">
          <Field label="Employee ID" value={employee_id} onChange={setEid} disabled={isEdit} placeholder="EMP001" />
          <Field label="Name" value={name} onChange={setName} />
          <Field label="Username (no @)" value={username} onChange={setUsername} disabled={isEdit} placeholder="alice" />
          <Field label="Phone" value={phone} onChange={setPhone} placeholder="+91..." />
          <Field label={isEdit ? "New PIN (optional)" : "PIN"} value={pin} onChange={(v) => setPin(v.replace(/\D/g, ""))} type="password" maxLength={6} />
          <div>
            <label className="mono mb-1 block text-[10px] uppercase tracking-wider text-dim">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="mono w-full rounded-[3px] border border-border bg-panel-2 px-3 py-2 text-xs uppercase"
            >
              {ROLES.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </div>
        </div>
        <div className="border-t border-border p-3">
          <button
            onClick={submit}
            disabled={!valid || busy}
            className="mono w-full rounded-[3px] bg-accent-lime px-3 py-2 text-xs font-bold uppercase tracking-wider text-background disabled:opacity-40"
          >
            {isEdit ? "Save" : "Create user"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", disabled, placeholder, maxLength,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; disabled?: boolean; placeholder?: string; maxLength?: number;
}) {
  return (
    <div>
      <label className="mono mb-1 block text-[10px] uppercase tracking-wider text-dim">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="mono w-full rounded-[3px] border border-border bg-panel-2 px-3 py-2 text-xs disabled:opacity-50"
      />
    </div>
  );
}
