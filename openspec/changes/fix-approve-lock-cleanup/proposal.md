## Why

`onApproveEvent` (`server.ts:429-456`) acquires a distributed lock via `redis.hSetNX` with a 10-second TTL, then performs `hSet` (move to active) and `hDel` (remove from pending). If either `hSet` or `hDel` throws after the lock is acquired, the lock is never explicitly released. It will eventually expire (10s TTL), but during that window the event cannot be re-approved, and the failure path produces no cleanup log.

## Priority: 3/5

## Status: proposed

## What Changes

- Wrap the `hSet` + `hDel` block in a try/finally.
- The `finally` block calls `redis.del(lockKey)` to release the lock immediately on success or failure.
- The existing 10s TTL remains as a safety net in case the explicit delete fails.
- Add logging: `[APPROVE] lock-released id={eventId} result={success|error}`.
- Mods can re-attempt approve immediately after a failure, instead of waiting up to 10s.

## Capabilities

### New Capabilities
- `approve-lock-cleanup`: Distributed approve lock is released explicitly in a `finally` block, with 10s TTL as backup.

### Modified Capabilities
- None.

## Impact

- `src/server/server.ts`: refactor `onApproveEvent` body to use try/finally.

## Code Sketch (after fix)

```ts
// after hSetNX + expire:
let lockReleased = false;
try {
  await redis.hSet("meetit:active_events", { [eventId]: eventJson });
  await redis.hDel("meetit:pending_events", [eventId]);
  const event = JSON.parse(eventJson) as MeetitEvent;
  console.log(`[APPROVE] ${event.title} approved`);
} finally {
  try {
    await redis.del(lockKey);
    lockReleased = true;
    console.log(`[APPROVE] lock-released id=${eventId}`);
  } catch (delErr) {
    console.error(`[APPROVE] lock-release-failed id=${eventId} err=${delErr}`);
  }
}
return { type: "approve-event", success: true };
```

## Why 3/5

The 10s TTL prevents the lock from leaking forever, so this isn't a critical data-loss bug. But it does cause user-visible "ghost" lockouts for 10s after any transient Redis failure, and the explicit cleanup makes the failure path more debuggable.
