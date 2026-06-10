import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapAdmin, customLogin } from "@/lib/bootstrap.functions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — task8" },
      {
        name: "description",
        content:
          "Sign in to task8, the ultra-fast multi-user task management app for teams.",
      },
      { property: "og:title", content: "Login — task8" },
      {
        property: "og:description",
        content: "Sign in to task8 and manage your team's tasks.",
      },
      { property: "og:url", content: "https://turbo-task.lovable.app/login" },
    ],
    links: [{ rel: "canonical", href: "https://turbo-task.lovable.app/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const { profile, loading } = useAuth();
  const [eid, setEid] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [lockMsg, setLockMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const bootedRef = useRef(false);

  // Bootstrap the admin account on first mount (idempotent)
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    bootstrapAdmin().catch((e) => console.warn("bootstrap:", e));
  }, []);

  // If already signed in, go to /tasks
  useEffect(() => {
    if (!loading && profile) nav({ to: "/tasks", replace: true });
  }, [loading, profile, nav]);

  // Countdown ticker
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setLockMsg(null);
    try {
      const res = await customLogin({ data: { employee_id: eid, pin } });
      if (!res.ok) {
        if (res.code === "locked" && "locked_until" in res && res.locked_until) {
          const secs = Math.max(0, Math.floor((new Date(res.locked_until).getTime() - Date.now()) / 1000));
          setCountdown(secs);
          setLockMsg("Account locked");
        } else {
          toast.error(res.message + ("attempts_left" in res ? ` · ${res.attempts_left} attempts left` : ""));
        }
        return;
      }
      // Set the session into the browser client so it persists.
      const { error } = await supabase.auth.setSession({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      nav({ to: "/tasks", replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <h1 className="sr-only">Login to task·8</h1>
      <div className="mb-10" aria-hidden="true">
        <div className="mono text-3xl font-bold tracking-tight text-foreground">
          task<span className="text-accent-lime">·</span>8
        </div>
      </div>

      <form onSubmit={submit} className="w-full max-w-xs space-y-3">
        <div>
          <label className="mono mb-1 block text-[10px] uppercase tracking-wider text-dim">Employee ID</label>
          <input
            autoFocus
            autoComplete="username"
            value={eid}
            onChange={(e) => setEid(e.target.value.toUpperCase())}
            className="mono w-full rounded-[3px] border border-border bg-panel px-3 py-3 text-sm uppercase focus:border-accent-lime focus:outline-none"
            placeholder="ADMIN001"
          />
        </div>
        <div>
          <label className="mono mb-1 block text-[10px] uppercase tracking-wider text-dim">PIN</label>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="current-password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="mono w-full rounded-[3px] border border-border bg-panel px-3 py-3 text-sm tracking-[0.4em] focus:border-accent-lime focus:outline-none"
            placeholder="••••"
          />
        </div>

        {lockMsg && countdown > 0 && (
          <div className="mono rounded-[3px] border border-[color:var(--p1)] bg-panel p-2 text-center text-xs text-[color:var(--p1)]">
            {lockMsg} · unlocks in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !eid || pin.length < 4 || countdown > 0}
          className="mono w-full rounded-[3px] bg-accent-lime px-4 py-3 text-sm font-bold uppercase tracking-widest text-background disabled:opacity-40"
        >
          {busy ? "…" : "Login"}
        </button>
      </form>
    </div>
  );
}
