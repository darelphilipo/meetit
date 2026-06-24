# e30-reminder-2h Tasks

## 1. Add reminder_hours_2 setting

- [x] 1.1 Add `reminder_hours_2` to `devvit.json` after `reminder_hours`
- [x] 1.2 Type: number, default: 2, label explains "Set to 0 to disable"

## 2. Refactor onCheckEvents CRON

- [x] 2.1 Read `reminder_hours_2` from settings (default 0)
- [x] 2.2 Build `windows` array: `[{ hours: 24, key: "24h", prefix: "🔔 Event Reminder:" }, { hours: 2, key: "2h", prefix: "⏰ Starting Soon:" }]`
- [x] 2.3 Skip the 2h entry if `reminder_hours_2 === 0`
- [x] 2.4 Wrap the per-event post logic in a `for (const win of windows)` loop
- [x] 2.5 Use per-window dedup key: `meetit:reminded:${eventId}:${win.key}`
- [x] 2.6 Use window-specific title prefix via `buildReminderTitle(event, win.prefix)`
- [x] 2.7 Update log messages to include the window key (e.g., `[CRON] Reminder (2h) post sent for ...`)

## 3. Update buildReminderTitle

- [x] 3.1 Add optional `prefix` parameter with default `"🔔 Event Reminder:"`
- [x] 3.2 Replace the hardcoded `🔔 Event Reminder:` in the template with the parameter
- [x] 3.3 Update JSDoc to document the new parameter

## 4. Add unit tests

- [x] 4.1 Test `buildReminderTitle` with custom prefix ("⏰ Starting Soon:")
- [x] 4.2 Test `buildReminderTitle` with custom prefix AND empty location
- [x] 4.3 Verify all existing tests still pass (52/52 → 54/54)

## 5. Update reminder-system spec

- [x] 5.1 Add 3 new requirements:
  - "Second reminder window at reminder_hours_2 hours before event"
  - "Per-window dedup keys prevent duplicate posts"
  - "Different title prefixes per window"
- [x] 5.2 Each requirement has 3 scenarios (total +9)

## 6. Verify

- [x] 6.1 `npm test` — 54/54 pass (2 new tests)
- [x] 6.2 `openspec validate --strict` — all pass
- [x] 6.3 `npx tsc --build` — no new errors

## 7. Commit and document

- [x] 7.1 Commit: `feat(reminder): add 2-hour reminder window with separate dedup key`
- [x] 7.2 Push to origin
- [x] 7.3 Manual test on r/meetup_hub2_dev (deferred to post-merge)
