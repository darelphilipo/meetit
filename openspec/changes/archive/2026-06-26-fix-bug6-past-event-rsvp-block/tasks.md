## 1. Add Date Check

> **Audit (2026-06-19): No implicit block exists. `getActiveEvent` (server.ts:242) is a direct `hGet` with no date filter. The explicit check is necessary, not optional.**

- [ ] 1.1 In `onRsvp`, after `getActiveEvent`, check `event.date < today`
- [ ] 1.2 If so, return `{ success: false, error: "Cannot RSVP to past events" }` with HTTP 400
- [ ] 1.3 Log `[FEATURE] rsvp-past-event-blocked eventId={id} eventDate={d}`

## 2. Client

- [ ] 2.1 `tryShowServerError` already handles the error; verify toast says something useful

## 3. Test

- [ ] 3.1 Manual test: try to RSVP to event with yesterday's date via direct API call → 400
