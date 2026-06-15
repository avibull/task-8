// Firebase Cloud Messaging service worker for task8.
// Handles background pushes, repeats urgent alerts every 10s for up to
// 2 minutes, and focuses /tasks when the user taps the notification.

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDxT9vtNGErn5OJFaWg_GQo4f-ttZuCqDw",
  authDomain: "task8-kk.firebaseapp.com",
  projectId: "task8-kk",
  storageBucket: "task8-kk.firebasestorage.app",
  messagingSenderId: "487389747736",
  appId: "1:487389747736:web:76b403c4ccebbd1d3d816d",
});

const messaging = firebase.messaging();

// alertId -> { interval, stopTimer }
const urgentRepeats = new Map();

function stopUrgent(alertId) {
  const entry = urgentRepeats.get(alertId);
  if (!entry) return;
  clearInterval(entry.interval);
  clearTimeout(entry.stopTimer);
  urgentRepeats.delete(alertId);
}

function showNotif(title, body, alertId, urgent) {
  return self.registration.showNotification(title, {
    body,
    icon: "/icon-192.svg",
    badge: "/icon-192.svg",
    tag: alertId,
    renotify: !!urgent,
    requireInteraction: !!urgent,
    data: { alertId, urgent, link: "/tasks" },
  });
}

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const alertId = data.alertId || `a-${Date.now()}`;
  const urgent = data.type === "urgent";
  const title = (payload.notification && payload.notification.title) || "task8";
  const body = (payload.notification && payload.notification.body) || "";

  showNotif(title, body, alertId, urgent);

  if (urgent && !urgentRepeats.has(alertId)) {
    const interval = setInterval(() => {
      showNotif(title, body, alertId, true);
    }, 10000);
    const stopTimer = setTimeout(() => stopUrgent(alertId), 120000);
    urgentRepeats.set(alertId, { interval, stopTimer });
  }
});

self.addEventListener("notificationclick", (event) => {
  const data = (event.notification && event.notification.data) || {};
  const alertId = data.alertId;
  if (alertId) stopUrgent(alertId);
  event.notification.close();

  const link = (data && data.link) || "/tasks";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if ("focus" in c) {
          try {
            await c.navigate(link);
          } catch {}
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    })(),
  );
});

self.addEventListener("notificationclose", (event) => {
  const data = (event.notification && event.notification.data) || {};
  if (data.alertId) stopUrgent(data.alertId);
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
