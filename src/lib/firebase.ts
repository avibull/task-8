/**
 * Firebase Cloud Messaging setup for task8.
 *
 * - Initializes the Firebase app once.
 * - Requests Notification permission and gets a token bound to the
 *   `firebase-messaging-sw.js` service worker.
 * - Upserts the token into `public.fcm_tokens` for the signed-in user.
 * - Exposes a foreground message subscriber for in-app toasts.
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  type MessagePayload,
  type Messaging,
} from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";

const firebaseConfig = {
  apiKey: "AIzaSyDxT9vtNGErn5OJFaWg_GQo4f-ttZuCqDw",
  authDomain: "task8-kk.firebaseapp.com",
  projectId: "task8-kk",
  storageBucket: "task8-kk.firebasestorage.app",
  messagingSenderId: "487389747736",
  appId: "1:487389747736:web:76b403c4ccebbd1d3d816d",
};

const VAPID_KEY =
  "BHjRCokftBUKvtnNzqKSdraELIjBbvzz31j6Eu1GBZUGnsEF20j9xgaYv0gr5Cso-tqoxS99YV-9fONzFYBkAqc";

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function getApp(): FirebaseApp {
  if (app) return app;
  app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

function getMessagingInstance(): Messaging {
  if (messaging) return messaging;
  messaging = getMessaging(getApp());
  return messaging;
}

/**
 * Request notification permission and fetch an FCM token bound to the
 * messaging service worker. Returns null when unsupported or denied.
 */
export async function registerFCMToken(): Promise<string | null> {
  if (!isSupported()) return null;
  try {
    if (Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return null;
    } else if (Notification.permission !== "granted") {
      return null;
    }

    // Unregister any old firebase-messaging-sw.js with non-root scope
    // so we can re-register at root scope (required for reliable
    // background delivery when the PWA is closed).
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      const url = reg.active?.scriptURL || "";
      if (url.includes("firebase-messaging-sw.js") && !reg.scope.endsWith("/")) {
        try {
          await reg.unregister();
        } catch {}
      }
    }

    // Register the messaging SW at root scope.
    const swReg = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" },
    );
    try {
      await swReg.update();
    } catch {}
    await navigator.serviceWorker.ready;

    const token = await getToken(getMessagingInstance(), {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });
    return token || null;
  } catch (e) {
    console.warn("registerFCMToken failed", e);
    return null;
  }
}

/**
 * Save the FCM token to the database for this user. Idempotent.
 */
export async function saveFCMToken(username: string, userId: string): Promise<void> {
  try {
    const token = await registerFCMToken();
    if (!token) return;
    await supabase
      .from("fcm_tokens")
      .upsert(
        { user_id: userId, username, token, updated_at: new Date().toISOString() },
        { onConflict: "username,token" },
      );
  } catch (e) {
    console.warn("saveFCMToken failed", e);
  }
}

/**
 * Subscribe to foreground push messages. Returns an unsubscribe function.
 */
export function onForegroundMessage(
  cb: (payload: MessagePayload) => void,
): () => void {
  if (!isSupported()) return () => {};
  try {
    return onMessage(getMessagingInstance(), cb);
  } catch {
    return () => {};
  }
}
