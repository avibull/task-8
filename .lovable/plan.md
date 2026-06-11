## Root cause

`PickerSheet.tsx` (the shared sheet behind both ASSIGN and TAGS) renders its search input with `autoFocus`. On mobile, mounting an autofocused `<input>` pops the on-screen keyboard immediately — before the user has had a chance to scan the list.

## Fix

Remove `autoFocus` from the search input in `src/components/PickerSheet.tsx`. The input stays visible and tappable, so users who want to search just tap it; otherwise the keyboard never appears and the list is fully visible.

That's the only change — single attribute removal, one file.
