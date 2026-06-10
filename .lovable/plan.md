I found two likely causes for the installed phone app staying on “loading…”:

1. The installed app can still be controlled by the existing `/sw.js` app-shell cache, so old JavaScript can keep running even after fixes are deployed.
2. Auth startup still waits on the profile database request before ending the app-level loading state; if that request is blocked, slow, or fails oddly on mobile, `/tasks` can remain on the loading screen.

Plan:

- Replace the current app-shell service worker with a one-release cleanup worker at the same `/sw.js` path. This keeps the installable app metadata, but removes the stale app cache/control layer so returning installed apps pick up fresh code.
- Disable future app-shell service worker registration while leaving the manifest/icons intact, because the app only needs installability right now, not offline caching.
- Make auth startup two-phase: restore the local session quickly, end `loading` immediately, then fetch the profile with a short timeout and safe fallback.
- Update route behavior so unauthenticated users are sent to login after auth readiness, while signed-in users don’t get stuck forever if profile fetch is slow.
- Add a tiny recovery path for invalid/stale mobile sessions: clear bad auth state and show the login screen instead of hanging.
- Fix the React `key` warning in the task list while touching the loading path.

After this is published, you should first fully close and reopen the installed app. Reinstall should only be needed if the phone OS has cached old manifest fields/icon labels, not for this loading issue.