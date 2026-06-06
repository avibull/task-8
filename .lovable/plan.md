## Change 1 — Settings as buttons + drawers/overlay

Rewrite `src/routes/settings.tsx` so the body is a vertical list of full-width buttons with chevron-right icons. Each opens its own surface; the existing section content moves inside.

Buttons (in order):
- **Change PIN** → bottom drawer (~40vh) with Old/New/Confirm PIN inputs + Save. Uses existing `changePin` logic. Closes on success/swipe/outside-tap.
- **Display** → bottom drawer (~30vh) with the existing dark/light toggle, relocated as-is.
- **Tag management** → bottom drawer (~60vh), visible only when `is_admin || can_edit_tags`. Fixed "+ New tag" input + Add button at top, scrollable existing-tags list with trash icon below. Reuses `useTags().addCustom/remove`.
- **Manage users** → full-screen overlay (fixed inset-0, slide/fade in), visible only when `is_admin`. Has its own top-left back/close button. Content: the existing `/admin` page UI extracted into a reusable `AdminPanel` component.

Implementation notes:
- Add a thin `SettingsDrawer` wrapper around shadcn `vaul` `Drawer` (already installed) with a drag handle, outside-tap and swipe-down close. Use `DrawerContent` with explicit `style={{ height: '40vh' }}` etc.
- Extract `src/routes/admin.tsx`'s body into `src/components/AdminPanel.tsx` (props: `onClose?`). Keep `/admin` route working by rendering `<AdminPanel />` there too, so direct links still work.
- Manage-users overlay = `<div className="fixed inset-0 z-50 bg-background">` with header + `<AdminPanel onClose={...} />`.

## Change 2 — Explicit send button in AddBar

In `src/components/AddBar.tsx`:
- Keep the existing Enter-to-submit form.
- Replace the right-side mic-only slot with conditional: if `val.trim()` is non-empty, render a filled accent send button (`Send` icon, `bg-accent-lime text-background`) as `type="submit"`. Otherwise render the disabled mic button as today.
- No mic relocation — it simply swaps places with send.

## Change 3 — New-task defaults + post-create focus

`src/lib/useTasks.ts`:
- `create()` returns the inserted task id. Default `priority: "P1"`. Remove the "today" auto-tag fallback so default `tags = []`. `assigned_to` unchanged.
- Insert with `.select().single()` and return `data.id`.

`src/routes/tasks.tsx`:
- Change `AddBar`'s `onAdd` to `await create(...)`, then `setExpandedId(newId)` (which already collapses any other expanded task since only one id is held).
- After expansion, `requestAnimationFrame` → look up `document.getElementById(`task-${newId}`)` and call `scrollIntoView({ block: 'center', behavior: 'smooth' })`.
- Add a transient `pulseId` state set for ~500ms after creation; pass to `TaskRow` as a `pulse` boolean.

`src/components/TaskRow.tsx`:
- Add `id={`task-${task.id}`}` on the outer wrapper.
- When `pulse` is true, add a brief ring/animate class (e.g. `animate-[pulse_0.5s_ease-out]` via a one-off Tailwind keyframe or temporary `ring-2 ring-accent-lime`) on the expanded panel.

## Files touched

- `src/routes/settings.tsx` (rewrite to button list + drawers + overlay)
- `src/components/AdminPanel.tsx` (new, extracted)
- `src/routes/admin.tsx` (renders `AdminPanel`)
- `src/components/AddBar.tsx` (send button)
- `src/lib/useTasks.ts` (defaults + return id)
- `src/routes/tasks.tsx` (await create, expand + scroll + pulse)
- `src/components/TaskRow.tsx` (id anchor + pulse prop)

## Out of scope

Schema, filtering, alerts, permissions, voice — all untouched.
