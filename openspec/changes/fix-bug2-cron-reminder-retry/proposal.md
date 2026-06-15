## Why

The CRON reminder fires when `hoursUntilEvent <= reminderHours && hoursUntilEvent >= 0`. If the CRON has downtime or runs late, the window is missed and the `remindedKey` flag prevents re-sending. Users never get the reminder.

## Priority: 2/5

## Status: proposed

## What Changes

- Extend the CRON reminder window to allow retry within 1 hour after the event start time.
- New condition: `(hoursUntilEvent <= reminderHours && hoursUntilEvent >= 0) || (hoursUntilEvent < 0 && hoursUntilEvent >= -1)`
- If a reminder fails (e.g., modmail throws), do NOT set `remindedKey`, so the next CRON cycle can retry.
- Log `[FEATURE] cron-reminder retry eventId={id} hoursSinceStart={h} result={sent|failed}`.

## Capabilities

### New Capabilities
- `cron-reminder-retry`: Retry missed reminders within 1h after event start; don't mark as sent on failure.

### Modified Capabilities
- None.

## Impact

- `src/server/server.ts`: update `onCheckEvents` reminder condition + retry logic.

## Why Low Priority

The CRON has been reliable in production; downtime is rare. This is a defense-in-depth change.
