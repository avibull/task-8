## Fix React error #310 on /tasks

**Root cause:** In `src/routes/tasks.tsx`, `const [pulseId, setPulseId] = useState<string | null>(null)` is declared after the `if (loading || !profile) return ...` early-return. When `loading` flips from `true` to `false`, the hook count changes between renders, which throws React's "Rendered more hooks than during the previous render" (minified #310).

**Fix:** Move the `pulseId` `useState` up next to the other `useState` calls at the top of `TasksPage`, before any early return. No behavior change.

### Change
In `src/routes/tasks.tsx`:
- Add `const [pulseId, setPulseId] = useState<string | null>(null);` alongside the other `useState` declarations (near `expandedId`, `sheetTask`, etc.).
- Remove the duplicate declaration that currently sits below the `loading` guard.

That's the only edit. No other files, schema, or logic touched.
