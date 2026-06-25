## Why

The CRON reminder fires when `hoursUntilEvent <= reminderHours && hoursUntilEvent >= 0`. If the CRON has downtime or runs late, the window is missed and the `remindedKey` flag prevents re-sending. Users never get the reminder.

## Priority: 2/5

## Status: implemented (via e30, archived 2026-06-25)

## Code History

**Original bug (as of 2026-06-19):** `onCheckEvents` (`server.ts:771`) had two issues:
1. `hoursUntilEvent < 0` skipped past events entirely — no retry window
2. `remindedKey` set before `submitCustomPost` — a failed post never retried

**Fixed by e30 (commit `c9e7631`):** The CRON was refactored to loop over windows `[24h, 2h]`. The condition at line 1050 uses `hoursUntilEvent > win.hours || hoursUntilEvent < -1`, allowing retry within 1h after event start. The `remindedKey` (now per-window: `meetit:reminded:${eventId}:24h` and `:2h`) is set AFTER `submitPost` succeeds (line 1092). Both issues are resolved.

**Note:** The original proposal referenced modmail (`sendPrivateMessage`) for reminders. The shipped code uses `submitPost` (plain text posts) instead, which was decided in e24.

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

## Current Code Regression (2026-06-15 audit)

`onCheckEvents` (`server.ts:777-782`) currently sets `remindedKey` BEFORE attempting the reminder post:

```ts
await redis.set(remindedKey, "true");     // line 777 — flag set first
await redis.expire(remindedKey, 86400);   // line 778
console.log(`[CRON] Reminder post for ${event.title}`);
try {
  await reddit.submitCustomPost({ ... }); // line 781 — post second
} catch (e) { console.error(`[CRON] Post failed: ${e}`); }
```

This means a failed post leaves the flag set, and the reminder will NOT be retried. This is the exact failure mode this change is supposed to fix. **When implementing this change, move lines 777-778 to AFTER the successful `submitCustomPost` call (inside the try block, after the await).**
