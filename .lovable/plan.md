## What you're seeing

- Settings → **Manage users** and the task drawer's **ASSIGN** sheet show no users.
- Already-assigned usernames still render on old tasks because those are just strings stored in `tasks.assigned_to` — rendering them never reads the profile list.

## Root cause

The database is fine. I confirmed:
- 3 active rows in `public.profiles` (admin, prachi, avinash).
- `public.list_active_profiles()` (SECURITY DEFINER) returns all 3.
- `EXECUTE` and `SELECT` grants for `authenticated` are in place.

So the gap is on the client side. There are two independent code paths that load the user list, and **both silently swallow failures and never show a loading/error state** — so any transient failure leaves the list permanently empty:

1. **ASSIGN sheet** (`src/components/UserPicker.tsx`) calls `supabase.rpc("list_active_profiles")` inside a fire-and-forget `.then(...)`. If the call errors or returns `null`, `profiles` stays `[]` forever for the lifetime of that picker mount, and `PickerSheet` just shows "no matches". There is no retry, no toast, no console log.
2. **Settings → Manage users** (`src/components/AdminPanel.tsx`) calls the `listUsers` server fn, which depends on the request bearer being attached by `attachSupabaseAuth`. The wrap-in-`<Outlet />` admin overlay is mounted inside `/settings`, which is **not** under `_authenticated/`, so on a hard refresh the SSR pass can race ahead of the session restore. If the bearer is missing when the panel opens, `requireSupabaseAuth` 401s → toast → empty list.

The shared cache in `src/lib/profilesCache.ts` makes case 1 worse: it caches `cache = []` on the first failed call (`((data) ?? [])`) and then returns that empty array forever — so `useProfileByUsername` also locks into "no profiles" until a full reload.

The reason old tasks still display assignees is unrelated to all of this: `TaskRow`/`UserMention` only need the `@username` string already stored on the task row to render the chip.

## Plan

1. **Add visible loading + error states** to `UserPicker` and `AdminPanel`. Empty `[]` and "still loading" and "failed to load" must look different. This alone tells us which of the two failure modes is happening.
2. **Fix the silent cache poisoning in `profilesCache.ts`**: only set `cache` when the RPC actually returns rows; on error, leave `cache = null` so the next consumer retries. Also expose a manual `refreshProfiles()` and call it after admin create/delete and on `SIGNED_IN`.
3. **Make `UserPicker` reuse `useProfiles()`** instead of its own one-shot RPC, so we only have one place to fix and it shares the (now-correct) cache.
4. **Make Manage users robust to a missing bearer**: on `refresh()` failure, re-check the session once and retry; surface the actual error message in the empty-state copy instead of just toasting. (Longer-term, `/settings` and the admin overlay belong under `_authenticated/`, but that's a bigger move — flag it as a follow-up, don't do it in this pass.)
5. Verify by opening Settings → Manage users and the ASSIGN sheet, confirming all 3 users appear, then hard-refreshing to confirm it still works cold.

### Files touched

- `src/lib/profilesCache.ts` — don't cache empty/error results; add `refreshProfiles()`; subscribe to `onAuthStateChange` SIGNED_IN to refresh.
- `src/components/UserPicker.tsx` — switch to `useProfiles()`; render loading + error rows.
- `src/components/AdminPanel.tsx` — track `status: idle | loading | error | ready`; show the error message in the empty cell; retry button.
- No DB / RLS / migration changes.

### Out of scope

- Moving `/settings` under `_authenticated/`.
- Changing how `tasks.assigned_to` stores usernames vs. user IDs.
