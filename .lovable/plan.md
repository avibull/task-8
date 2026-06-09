## Diagnosis

Re-verified the encoding logic in `src/components/UserMention.tsx`. For phone `+1 (555) 123-4567` and text `Call factory re: cashew delay`, the code produces exactly:

`https://wa.me/15551234567?text=Turbo.Task.Reminder-%20Call%20factory%20re%3A%20cashew%20delay`

So `encodeURIComponent` is doing its job. What the user is seeing is most likely one of:

1. The link literally not navigating in the Lovable preview iframe — `target="_blank"` + `rel="noopener noreferrer"` is silently blocked because the preview iframe's `sandbox` doesn't include `allow-popups`. Result: click does nothing, WhatsApp never opens.
2. The "no %20" perception comes from copying / hovering the link — browsers display decoded characters in the status bar / clipboard preview even though the underlying URL is encoded. That part is not a real bug, but we'll add an objective check.

## Fix

Edit `src/components/UserMention.tsx`:

- Replace the plain `<a target="_blank">` with a button that calls `window.open(waHref, "_blank", "noopener,noreferrer")` and falls back to `window.location.assign(waHref)` if `window.open` returns `null` (blocked popup). Closes the popover after triggering.
- Keep `href` on the element (as a real anchor with `target="_top"` as a no-JS fallback) so right-click → copy still gives the encoded URL.
- Add a tiny `console.debug("[wa]", waHref)` (gated to dev) so we can confirm the exact href in the next test pass without right-clicking.

No other files change. No business logic, no encoding logic touched.

## Verification

1. Reload `/tasks`, open the `@prachi` popover on the "Weight discrepancy…" task.
2. Open devtools console — confirm the logged URL is exactly `https://wa.me/<digits>?text=Turbo.Task.Reminder-%20Weight%20discrepancy%20photos%20send%20to%20Meetu`.
3. Click "Open WhatsApp" — a new tab opens to wa.me (or, if popups are blocked by the iframe sandbox, the current tab navigates there as a fallback). The popover closes.
4. Repeat from the expanded drawer and from an alerts panel mention to confirm parity.

## Out of scope

No changes to ping flow, mention-trigger UI, profile cache, or alerts panel — just the WhatsApp action behavior inside `UserMention`.
