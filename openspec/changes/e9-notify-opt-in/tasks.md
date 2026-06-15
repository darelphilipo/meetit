## 1. Server: Storage

- [ ] 1.1 Add `NOTIFY_OPT_IN` endpoint constant in `src/shared/api.ts`
- [ ] 1.2 Implement `onNotifyOptIn` handler in `src/server/server.ts`:
  - Auth required, `eventId` and `enabled: boolean` from body
  - If `enabled`, `redis.set("meetit:notify_opt_in:{eventId}:{username}", "1", { expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })`
  - If `!enabled`, `redis.del(key)`
  - Log `[FEATURE] notify-opt-in eventId={id} user={u} enabled={bool}`
- [ ] 1.3 Return `{ success: true }`

## 2. Server: CRON Hook (Stub for Now)

- [ ] 2.1 In `onCheckEvents`, when iterating pending reminders, also `redis.get` the opt-in key for each attendee
- [ ] 2.2 Log `[FEATURE] notify-opt-in would-send eventId={id} user={u}` (no actual push yet)
- [ ] 2.3 (Future, blocked on push approval) replace log with `reddit.sendPushNotification(...)`

## 3. Client: Checkbox in RSVP Success State

- [ ] 3.1 In `submitRsvp` success branch, add `<label><input type="checkbox" data-action="toggle-notify-opt-in" data-id={eventId} checked /> 🔔 Remind me before this event</label>`
- [ ] 3.2 Add `case "toggle-notify-opt-in"` in `handleAction()`:
  - Read checkbox state
  - Call `/api/notify-opt-in` with `{ eventId, enabled: checked }`
  - Show toast "Notification preference saved" (success) or "Save failed" (error)
- [ ] 3.3 Default state: checked (opt-in by default is friendlier for event apps; user can uncheck)

## 4. devvit.json

- [ ] 4.1 Add `permissions` field with `push-notifications` and a comment explaining it's pending approval
- [ ] 4.2 (Future, on approval) remove the comment, verify no other config changes needed

## 5. Logging & Polish

- [ ] 5.1 Add `log()` calls at every changed path per §0.2
- [ ] 5.2 Update LEARNINGS.md with the opt-in storage pattern
- [ ] 5.3 Run `npm run build`, `npm test`, `npm run type-check`
- [ ] 5.4 Commit, push, create OpenSpec archive

## 6. Tests

- [ ] 6.1 Test: `onNotifyOptIn` rejects unauthenticated users
- [ ] 6.2 Test: opt-in creates a Redis key with 7-day TTL
- [ ] 6.3 Test: opt-out deletes the key
