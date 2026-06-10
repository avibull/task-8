## Rename TurboTask → task8

### Branding rules
- Plain text (titles, manifest, banner, alt copy): `task8`
- Stylized (header + login): `task·8` with `·` wrapped in `<span className="text-accent-lime">`
- Always lowercase

### File changes

**`public/manifest.json`**
- `name`: `TurboTask` → `task8`
- `short_name`: `TurboTask` → `task8`
- `description`: `Ultra-fast task capture for teams` → `Fast team task management`

**`public/icon-192.svg` and `public/icon-512.svg`**
- Replace with the provided SVG (`t·8` glyph). Use the same SVG content for both files; only the outer `width`/`height` differ but the viewBox is 512×512 so the inner glyph is identical.

**`public/sw.js`**
- `CACHE_NAME`: `turbotask-v1` → `task8-v1` (forces cache refresh for installed users).

**`src/routes/__root.tsx`**
- `title`: `turbo·task` → `task·8` (note: titles are plain text — the `·` will render as a literal dot in the browser tab, which matches the spec "browser tab → task8" — so set title to `task8` plain, not `task·8`). Per spec table: App title in browser tab = `task8`. Will use `task8`.
- `apple-mobile-web-app-title`: `TurboTask` → `task8`

**`src/components/InstallPrompt.tsx`**
- Banner copy: `Install TurboTask as an app` → `Install task8 as an app`
- The small avatar glyph currently shows `t·t` — update to `t·8` to match new icon.

**`src/routes/login.tsx`**
- Login brand JSX: `turbo<span>·</span>task` → `task<span>·</span>8`

**`src/routes/tasks.tsx`**
- Header brand JSX (line 174): `turbo<span>·</span>task` → `task<span>·</span>8`

### Intentionally NOT changed
- `src/lib/types.ts` — `empEmail()` builds `@turbotask.local` for the auth synthetic email. This is the persisted login identity for every existing user; changing it would break all logins. Leaving as-is.
- `src/routes/tasks.tsx` line 27 — `SORT_STORAGE_KEY = "turbotask.sort"` is an internal localStorage key; renaming would wipe user sort prefs. Leaving as-is.
- `node_modules/*` matches are unrelated 3rd-party (Turborepo).

Confirm and I'll apply.
