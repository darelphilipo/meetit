## 1. Server: Rate Limit Helper

- [ ] 1.1 Add `RATE_LIMITED` error code to `src/shared/api.ts`
- [ ] 1.2 Implement `checkRateLimit(userId, endpoint, maxPerHour)` in `src/server/server.ts`:
  - Use a sorted set: `meetit:rate:{userId}:{endpoint}`
  - Drop entries older than 1h
  - `ZCARD` for current count
  - If `count >= maxPerHour`, return `{ allowed: false, retryAfter: oldestTimestamp + 3600 - now }`
  - If allowed, `ZADD` new entry with score = `Date.now()`
  - Set TTL to 1h
  - Log `[FEATURE] rate-limit endpoint={path} user={u} count={n} limit={max} action={allowed|denied}`
- [ ] 1.3 Mods (via `requireMod` check) are exempt

## 2. Wire into Endpoints

- [ ] 2.1 `onRsvp`: limit 20/h
- [ ] 2.2 `onLeaveEvent`: limit 20/h
- [ ] 2.3 `onSubmitEvent`: limit 5/h
- [ ] 2.4 `onSubmitPitch`: limit 10/h
- [ ] 2.5 Each returns `429` with `{ error: "Rate limit exceeded" }` on block

## 3. Client: Error Handling

- [ ] 3.1 `tryShowServerError()` already handles 429 if we include the message
- [ ] 3.2 Toast: "⏸️ Slow down! Try again in N minutes" with `retryAfter`

## 4. Logging & Polish

- [ ] 4.1 Add `log()` calls at every changed path per §0.2
- [ ] 4.2 Update LEARNINGS.md
- [ ] 4.3 Run `npm run build`, `npm test`, `npm run type-check`
- [ ] 4.4 Commit, push, create OpenSpec archive

## 5. Tests

- [ ] 5.1 Test: 20 RSVPs allowed in 1h, 21st blocked
- [ ] 5.2 Test: limit resets after 1h
- [ ] 5.3 Test: mods are exempt
