## Goal
Strip the prefilled message from the WhatsApp link in the @-user popover. The link should open WhatsApp to the contact's chat with an empty input.

## Change
Edit `src/components/UserMention.tsx`:
- Remove `textParam` and the `encodeURIComponent` / `Turbo.Task.Reminder-` logic.
- Build `waHref` as `https://wa.me/${digits}` only — no `?text=` param.
- Remove the `task` dependency from WhatsApp URL construction. The `task` prop remains because the **Ping about this task** action still uses it.
- Update the component JSDoc to reflect that `task` only enables the ping action, not WhatsApp prefilling.

## Verification
Click an @-user mention in the task list, expanded drawer, alerts panel, or action sheet. The WhatsApp link should show the bare `https://wa.me/<digits>` format in the popover. The **Ping about this task** option should still appear and function when a task is present.