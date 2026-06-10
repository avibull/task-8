/**
 * App-shell service worker is disabled. The /sw.js file is now a one-release
 * kill-switch worker that unregisters itself; we still need to register it
 * once so returning installed apps load it and drop stale caches. We also
 * proactively unregister any older SW registration we encounter.
 */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const host = window.location.hostname;
  const inIframe = window.self !== window.top;
  const killSwitch = url.searchParams.get("sw") === "off";

  const isPreviewHost =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev");

  const refused = !import.meta.env.PROD || inIframe || isPreviewHost || killSwitch;

  if (refused) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => {
        if (r.active?.scriptURL.endsWith("/sw.js")) r.unregister();
      });
    }).catch(() => {});
    return;
  }

  // Production: register the kill-switch worker exactly once so installed
  // apps pick it up and drop their old app-shell cache; the worker
  // unregisters itself in activate.
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
