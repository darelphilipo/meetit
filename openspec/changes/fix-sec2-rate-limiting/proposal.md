## Why

The Meetit app has zero rate limiting on any endpoint. A malicious user (or compromised account) could spam the app with thousands of RSVPs, event submissions, or pitch ideas, exhausting Redis and flooding the subreddit. This is a data integrity and availability risk.

## Priority: 4/5

## Status: proposed

## What Changes

- Add a simple per-user rate limiter using Redis sorted sets (sliding window).
- Limits:
  - `/api/rsvp`, `/api/leave-event`: max 20 actions per hour per user
  - `/api/submit-event`: max 5 actions per hour per user
  - `/api/submit-pitch`: max 10 actions per hour per user
  - `/api/notify-opt-in` (when implemented): max 50 actions per hour per user
- On limit exceeded, return HTTP 429 with `{ error: "Rate limit exceeded, try again in N minutes" }`.
- Log `[FEATURE] rate-limit endpoint={path} user={u} count={n} limit={max} action={allowed|denied}`.

## Capabilities

### New Capabilities
- `rate-limiting`: Per-user, per-endpoint sliding-window rate limit using Redis sorted sets.

### Modified Capabilities
- None.

## Impact

- `src/server/server.ts`: new `checkRateLimit(userId, endpoint, maxPerHour)` helper. Call it at the start of each rate-limited handler.
- `src/shared/api.ts`: new `RATE_LIMITED` error code constant.

## Design Decisions (to finalize in design.md)

- **Algorithm:** sliding window via Redis sorted set. Each action is a member with score = timestamp. On each call, `ZREMRANGEBYSCORE` to drop entries older than 1h, `ZCARD` to count, `ZADD` if under limit.
- **Storage:** one key per (user, endpoint): `meetit:rate:{userId}:{endpoint}`. Auto-expires after 1h of inactivity.
- **Atomicity:** use a Lua script or `Promise.all` for the 3-step check-and-add. Or accept a small race window for v1.
- **Mods:** mods should be exempt from rate limits (they may need to take many actions during a cleanup).

## Out of Scope

- IP-based rate limiting (Devvit abstracts the IP; not easily accessible).
- Global rate limits (per-user is sufficient for a small community).
- CAPTCHA or other bot challenges.
