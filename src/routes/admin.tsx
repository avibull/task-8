import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { canManageUsers } from "@/lib/types";
import { AdminPanel } from "@/components/AdminPanel";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const nav = useNavigate();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && !profile) nav({ to: "/login", replace: true });
    if (!loading && profile && !canManageUsers(profile)) nav({ to: "/tasks", replace: true });
  }, [loading, profile, nav]);

  if (!profile || !canManageUsers(profile)) return null;
  return <AdminPanel />;
}
