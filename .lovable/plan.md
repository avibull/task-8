## Root cause

Every task row in `SortableTaskRow.tsx` spreads dnd-kit's `{...attributes} {...listeners}` on the **entire row wrapper**, and `tasks.tsx` configures both `PointerSensor` and `TouchSensor` with:

```ts
activationConstraint: { delay: 500, tolerance: 6 }
```

This is "press-and-hold to drag" mode. With it:

1. When you press a row, dnd-kit captures the pointer and **waits 500ms** to decide tap vs drag. The browser's `click` only fires after the pointer is released AND the delay was not promoted to a drag — so any tap shorter than the delay still feels laggy, and any tap that moves >6px during the wait gets cancelled outright (which on a touch device happens constantly from micro-scroll/finger jitter, so the tap silently does nothing).
2. The listeners wrap the **expanded drawer too**, so when one drawer is open and you tap another row, the pointer goes through the *other* row's 500ms sensor first. If the previously-open drawer is collapsing at that moment, the layout shifts under your finger past the 6px tolerance and the gesture is discarded — exactly the "click does nothing" symptom.
3. There is no dedicated drag handle, so the only way to drag is to long-press the row — which is the same gesture as "tap to expand", creating an inherent conflict that the delay sensor cannot resolve cleanly.

The earlier offline-first refactor is not the cause; `useSyncExternalStore` reads are sync and re-renders are cheap. The symptom is purely the gesture layer.

## Fix

Move drag activation off the row body and onto an explicit drag handle, so taps on the row never go through the dnd-kit pointer capture.

### 1. `src/components/SortableTaskRow.tsx`
- Render a small persistent grip handle on the left edge of every row.
- Attach `{...attributes} {...listeners}` only to that handle, not to the row wrapper.
- Keep `setNodeRef` / transform on the wrapper so layout animations still work.
- Handle gets `touch-action: none` so it owns its gesture; the rest of the row keeps normal click behavior.

### 2. `src/routes/tasks.tsx`
- Drop the 500ms press-and-hold activation. Use a small distance/tolerance constraint instead so a tap on the handle that doesn't move is still a click, but any movement immediately starts a drag:
  ```ts
  useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  useSensor(TouchSensor,   { activationConstraint: { distance: 6 } })
  ```
- No other logic changes.

### Why this fixes both symptoms
- Tapping any row (with or without another drawer open) no longer routes through a 500ms pointer-capture window, so `onClick` on the row fires immediately and is never cancelled by incidental finger movement or by layout shift from a collapsing drawer.
- Dragging still works, but is initiated from the grip handle only — the two gestures (tap-to-expand vs drag-to-reorder) are now on disjoint hit areas and can't conflict.

## Files touched
- `src/components/SortableTaskRow.tsx` — add grip handle, move dnd listeners onto it.
- `src/routes/tasks.tsx` — swap `delay`/`tolerance` for `distance` on both sensors.

No backend, schema, or data-layer changes.
