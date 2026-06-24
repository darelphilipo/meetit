# e30-reminder-2h

**Priority:** 3/5 (standard enhancement)

## Why

The reminder system currently posts a single reminder 24h before each event. A second reminder 2 hours before the event dramatically improves attendance — users get a "starting soon" nudge that's the difference between making it to the event and forgetting about it.

This is also a high-ROI, low-risk change: all the infrastructure (CRON, `submitPost`, dedup keys) is already in place. The change is a small refactor to loop over multiple reminder windows instead of a single hardcoded 24h window.

## What changes

- New `reminder_hours_2` setting in `devvit.json` (default 2, opt-out by setting to 0)
- `onCheckEvents` CRON handler refactored to loop over reminder windows
- Per-window dedup keys: `meetit:reminded:${eventId}:24h` and `meetit:reminded:${eventId}:2h`
- 24h reminder title prefix: `🔔 Event Reminder:` (existing)
- 2h reminder title prefix: `⏰ Starting Soon:` (new)
- Body markdown is identical between windows; only the title prefix differs
- `buildReminderTitle()` gains an optional `prefix` parameter (default `"🔔 Event Reminder:"` for backwards compatibility)

## Out of scope

- Push notifications (handled separately by `e9-notify-opt-in`)
- More than 2 reminder windows (the 2-window pattern is sufficient; adding a 3rd is a trivial config change in the future)
- Reminder customization per event (reminders are community-wide, not per-event)
- .ics file attachment (Google Calendar deep link is the calendar feature — see `e31-calendar-export`)

## Capabilities

### Modified Capabilities
- `reminder-system`: 3 new requirements (second window, per-window dedup, different title prefixes)

## Impact

- `devvit.json`: +8 lines (new setting)
- `src/server/server.ts`: ~30 line refactor in `onCheckEvents`
- `src/shared/meetit.ts`: `buildReminderTitle` gains optional `prefix` parameter
- `tools/meetit-behavior.test.ts`: 2 new tests for the prefix parameter
- `openspec/specs/reminder-system/spec.md`: 3 new requirements (9 scenarios)

## Task list

See `tasks.md`.
