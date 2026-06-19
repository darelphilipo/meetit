## Why

The CRON reminder fires when `hoursUntilEvent <= reminderHours && hoursUntilEvent >= 0`. If the CRON has downtime or runs late, the window is missed and the `remindedKey` flag prevents re-sending. Users never get the reminder.

## Priority: 2/5

## Status: proposed

## Audit (2026-06-19)

**Bug is still present.** Current code at `server.ts:771`:
```ts
if (hoursUntilEvent > reminderHours || hoursUntilEvent < 0) continue;       // line 771 — skips past events, no retry window
const remindedKey = `meetit:reminded:${eventId}`;
if (await redis.get(remindedKey)) continue;                                    // line 773
await redis.set(remindedKey, "true");                                          // line 774 — flag set BEFORE post attempt
await redis.expire(remindedKey, 86400);                                        // line 775
await reddit.submitCustomPost({...});                                          // line 778 — if this fails, flag already set
```

Two issues remain:
1. No retry window: `hoursUntilEvent < 0` skips past events entirely
2. `remindedKey` set before `submitCustomPost` — a failed post never retries

**Recommendation:** ~30 minutes. See tasks for details.
Tasks: 0/19 — all still pending.

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
