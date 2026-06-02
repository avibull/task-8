import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { empEmail, pinToPassword } from "./types";

/**
 * Creates the seed admin user if it doesn't exist.
 * Idempotent — safe to call on every app load.
 */
export const bootstrapAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const employee_id = "ADMIN001";
  const email = empEmail(employee_id);
  const pin = "1234";

  // Already exists?
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("employee_id", employee_id)
    .maybeSingle();
  if (existing) return { created: false };

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: pinToPassword(pin),
    email_confirm: true,
  });
  if (error || !created.user) throw new Error(error?.message ?? "createUser failed");

  const { error: pErr } = await supabaseAdmin.from("profiles").insert({
    id: created.user.id,
    employee_id,
    name: "Admin",
    username: "admin",
    phone: "+919812345678",
    is_admin: true,
    is_active: true,
  });
  if (pErr) throw new Error(pErr.message);

  return { created: true };
});

/**
 * Custom login: looks up employee_id, checks lockout, attempts sign-in,
 * increments failure counter / locks the account after 5 fails.
 */
export const customLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { employee_id: string; pin: string }) => d)
  .handler(async ({ data }) => {
    const employee_id = data.employee_id.trim().toUpperCase();
    const pin = data.pin.trim();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("employee_id", employee_id)
      .maybeSingle();

    if (!profile) {
      return { ok: false as const, code: "not_found", message: "Invalid credentials" };
    }
    if (!profile.is_active) {
      return { ok: false as const, code: "inactive", message: "Account inactive" };
    }
    if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
      return {
        ok: false as const,
        code: "locked",
        message: "Account locked",
        locked_until: profile.locked_until,
      };
    }

    const email = empEmail(employee_id);
    // Verify password by attempting sign-in via admin: we use the auth admin
    // password verification by trying signInWithPassword on a one-off client.
    const { createClient } = await import("@supabase/supabase-js");
    const tmp = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signIn, error: signErr } = await tmp.auth.signInWithPassword({
      email,
      password: pinToPassword(pin),
    });

    if (signErr || !signIn.session) {
      const newAttempts = (profile.failed_attempts ?? 0) + 1;
      const locked = newAttempts >= 5;
      await supabaseAdmin
        .from("profiles")
        .update({
          failed_attempts: locked ? 0 : newAttempts,
          locked_until: locked ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
        })
        .eq("id", profile.id);
      return {
        ok: false as const,
        code: "bad_pin",
        message: "Invalid credentials",
        attempts_left: Math.max(0, 5 - newAttempts),
      };
    }

    // Success — reset counters, return session tokens
    await supabaseAdmin
      .from("profiles")
      .update({ failed_attempts: 0, locked_until: null })
      .eq("id", profile.id);

    return {
      ok: true as const,
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    };
  });

/** Admin-only: change a user's PIN given current PIN. */
export const changePin = createServerFn({ method: "POST" })
  .inputValidator((d: { user_id: string; old_pin: string; new_pin: string }) => d)
  .handler(async ({ data }) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("employee_id")
      .eq("id", data.user_id)
      .maybeSingle();
    if (!profile) throw new Error("Profile not found");

    const { createClient } = await import("@supabase/supabase-js");
    const tmp = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const verify = await tmp.auth.signInWithPassword({
      email: empEmail(profile.employee_id),
      password: pinToPassword(data.old_pin),
    });
    if (verify.error) return { ok: false as const, message: "Old PIN incorrect" };

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: pinToPassword(data.new_pin),
    });
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });
