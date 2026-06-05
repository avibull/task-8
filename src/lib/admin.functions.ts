import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { empEmail, pinToPassword } from "./types";

async function ensureAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  if (!data || !data.is_admin) throw new Error("Forbidden");
  return supabaseAdmin;
}

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await ensureAdmin(context.userId);
    const { data, error } = await admin.from("profiles").select("*").order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { users: data };
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    employee_id: string; name: string; username: string; phone: string;
    pin: string; is_admin: boolean; can_edit_tags: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    const admin = await ensureAdmin(context.userId);
    const employee_id = data.employee_id.trim().toUpperCase();
    const username = data.username.trim().toLowerCase().replace(/^@/, "");
    const email = empEmail(employee_id);

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: pinToPassword(data.pin.trim()),
      email_confirm: true,
    });
    if (error || !created.user) return { ok: false as const, message: error?.message ?? "createUser failed" };

    const { error: pErr } = await admin.from("profiles").insert({
      id: created.user.id,
      employee_id,
      name: data.name.trim(),
      username,
      phone: data.phone.trim(),
      is_admin: data.is_admin,
      can_edit_tags: data.is_admin || data.can_edit_tags,
      is_active: true,
    });
    if (pErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return { ok: false as const, message: pErr.message };
    }
    return { ok: true as const };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    name?: string; phone?: string;
    is_admin?: boolean; can_edit_tags?: boolean;
    is_active?: boolean; new_pin?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const admin = await ensureAdmin(context.userId);
    const patch: {
      name?: string; phone?: string;
      is_admin?: boolean; can_edit_tags?: boolean;
      is_active?: boolean;
    } = {};
    if (data.name !== undefined) patch.name = data.name.trim();
    if (data.phone !== undefined) patch.phone = data.phone.trim();
    if (data.is_admin !== undefined) patch.is_admin = data.is_admin;
    if (data.can_edit_tags !== undefined || data.is_admin) {
      patch.can_edit_tags = data.is_admin ? true : !!data.can_edit_tags;
    }
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    if (Object.keys(patch).length > 0) {
      const { error } = await admin.from("profiles").update(patch).eq("id", data.id);
      if (error) return { ok: false as const, message: error.message };
    }
    if (data.new_pin) {
      const { error } = await admin.auth.admin.updateUserById(data.id, {
        password: pinToPassword(data.new_pin.trim()),
      });
      if (error) return { ok: false as const, message: error.message };
    }
    return { ok: true as const };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const admin = await ensureAdmin(context.userId);
    const { error } = await admin.auth.admin.deleteUser(data.id);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });
