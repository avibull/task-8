import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/contexts/AuthContext";
import { TagsProvider } from "@/contexts/TagsContext";
import { registerServiceWorker } from "@/lib/registerServiceWorker";
import { InstallPrompt } from "@/components/InstallPrompt";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0d0e10" },
      { title: "task8 — Ultra-fast Multi-user Task Management" },
      {
        name: "description",
        content:
          "Manage tasks with speed and precision using task8, the ultra-fast multi-user task management app built for teams.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "task8" },
      { property: "og:title", content: "task8 — Ultra-fast Multi-user Task Management" },
      {
        property: "og:description",
        content:
          "Capture, assign, tag, and ping tasks in real time. task8 is the ultra-fast multi-user task management app built for teams.",
      },
      { property: "og:url", content: "https://turbo-task.lovable.app/" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "task8 — Ultra-fast Multi-user Task Management" },
      {
        name: "twitter:description",
        content:
          "Capture, assign, tag, and ping tasks in real time. Built for teams.",
      },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "task8" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icon-192.svg" },
      { rel: "icon", href: "/icon-192.svg", type: "image/svg+xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "task8",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description:
            "Ultra-fast multi-user task management app for teams. Capture, assign, tag, and ping tasks in real time.",
          url: "https://turbo-task.lovable.app/",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mono text-dim">404 · not found</div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="mono max-w-md text-xs text-[color:var(--p1)]">err: {error.message}</div>
    </div>
  ),
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // theme bootstrap from localStorage
  useEffect(() => {
    const t = localStorage.getItem("tt_theme");
    const root = document.documentElement;
    if (t === "light") { root.classList.remove("dark"); root.classList.add("light"); }
    else { root.classList.remove("light"); root.classList.add("dark"); }
  }, []);

  // PWA service worker (guarded — skipped in Lovable preview / dev / iframe)
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TagsProvider>
          <Outlet />
          <InstallPrompt />
          <Toaster theme="dark" position="top-center" richColors />
        </TagsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
