## Why

`onApproveEvent` (`server.ts:429-456`) acquires a distributed lock via `redis.hSetNX` with a 10-second TTL, then performs `hSet` (move to active) and `hDel` (remove from pending). If either `hSet` or `hDel` throws after the lock is acquired, the lock is never explicitly released. It will eventually expire (10s TTL), but during that window the event cannot be re-approved, and the failure path produces no cleanup log.

## Priority: 1/5

## Category: edge-enhancement

## Status: deprioritized (2026-06-17)

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

## Why 1/5 (deprioritized 2026-06-17)

The 10s TTL self-heals, so the lock cannot leak forever. The "ghost lockout" UX bug only manifests if:

1. `hSet` or `hDel` throws inside `onApproveEvent` (rare Redis transient), AND
2. The mod retries the approve within the 10s window (a precise timing coincidence), AND
3. The 10s window happens to overlap with a single user interaction

This is a 1-in-10,000-class event, not a user-facing reliability issue. The fix is mechanically simple (5 lines) and aligns with LEARNINGS §24.2 ("lock should be released in `finally`"), but it is not blocking any other work and not addressing any confirmed user complaint.

**Re-prioritize to 3/5** if:
- A mod reports a real ghost-lockout incident
- A future change introduces more lock contention (e.g., a bulk-approve endpoint)
- We add per-mod approve quotas (the 10s self-heal may become a problem)

**Defensive merit:** The fix is small and clean. The case for it is consistency with the rest of the codebase's try/finally lock pattern, not a confirmed bug.
