## F11 — FCM Push Notifications

Add Firebase Cloud Messaging so task8 alerts arrive when the app is closed, the phone is locked, or Chrome is backgrounded. Urgent alerts repeat every 10s for up to 2 minutes.

### 1. Secrets
Add FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY, FCM_VAPID_KEY to the project's edge function secrets (values provided in the brief).

### 2. Database
New migration: `public.fcm_tokens` (user_id → auth.users, username, token, unique(username, token)) with RLS so users can only manage their own rows. Includes required GRANTs to `authenticated` and `service_role`.

### 3. Edge function: `send-fcm-notification`
- Builds a Google OAuth2 access token from the service account (RS256 JWT via Web Crypto).
- Looks up all FCM tokens for the recipient, sends a v1 FCM message per token with `notification`, `data`, and `webpush` block (icon, badge, `requireInteraction` for urgent, tag = alertId, link `/tasks`).
- Deletes any tokens that come back as invalid/unregistered.
- Standard CORS + OPTIONS handler.

### 4. Frontend Firebase setup
- `bun add firebase`
- `src/lib/firebase.ts`: initializes the app once, exposes `registerFCMToken(username)` (requests Notification permission, calls `getToken` with VAPID key and the ready service worker registration) and `onForegroundMessage(cb)`.
- `public/firebase-messaging-sw.js`: background message handler that shows the notification, manages an in-SW map of urgent repeat timers (10s interval, 2-min cap), and a `notificationclick` handler that stops repeats and focuses/opens `/tasks`.

### 5. Token registration on login
In `src/contexts/AuthContext.tsx`, after `setProfile(data)` in `loadProfile`, fire-and-forget `saveFCMToken(data.username, uid)` which calls `registerFCMToken` and upserts into `fcm_tokens` with `onConflict: "username,token"`.

### 6. Push on alert send
In `src/lib/useAlerts.ts`, after the local `sendAlerts` mutation, fire-and-forget a `supabase.functions.invoke("send-fcm-notification", …)` per recipient with alertId, type, title (urgent vs normal), and the task text. Failures are swallowed — DB row is the source of truth.

To get `task_text` cleanly, look up the task from the store snapshot inside `send()` before invoking.

### 7. Foreground handling
In `src/routes/tasks.tsx`, add a `useEffect` that subscribes to `onForegroundMessage` and shows a sonner toast (urgent → `Infinity` duration with a "View" action that opens the alerts panel; normal → 5s). Also calls `manualSync()` so the alert appears in the list immediately.

### Technical notes
- Service worker file is `public/firebase-messaging-sw.js` — the messaging SDK auto-registers it. The existing `public/sw.js` kill-switch is untouched (per PWA skill: messaging workers are exempt from the app-shell SW guards).
- `firebase-messaging-sw.js` uses the compat SDK via `importScripts` from gstatic, so no bundler changes are needed.
- Edge function uses `SUPABASE_SERVICE_ROLE_KEY` to read tokens for arbitrary recipients (bypassing RLS) and to delete stale ones.
- Firebase web config (apiKey, etc.) is publishable and lives in source.
- iOS Safari: push works only when the PWA is installed to the home screen and the user has granted notification permission — expected platform behavior, no extra code.

### Files touched
- New: `supabase/migrations/<ts>_fcm_tokens.sql`, `supabase/functions/send-fcm-notification/index.ts`, `src/lib/firebase.ts`, `public/firebase-messaging-sw.js`
- Edited: `src/contexts/AuthContext.tsx`, `src/lib/useAlerts.ts`, `src/routes/tasks.tsx`, `package.json` (firebase dep)
