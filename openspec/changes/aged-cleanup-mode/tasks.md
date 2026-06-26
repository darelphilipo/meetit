## 1. devvit.json: settings + scheduler

- [ ] 1.1 In `devvit.json` settings block (after `timezone`), add:
  ```json
  "cleanup_after_days": {
    "type": "number",
    "label": "Aged Cleanup: Days Before Deletion (1-365)",
    "helpText": "Events past their event-date by more than this many days, and pitches submitted more than this many days ago, are hard-deleted by the daily cleanup CRON. Default 30.",
    "defaultValue": 30
  },
  "pause_cleanup": {
    "type": "boolean",
    "label": "Pause Automatic Aged Cleanup",
    "helpText": "When enabled, the auto CRON skips cleanup. The manual 'Run cleanup now' button still works. Useful before a big release.",
    "defaultValue": false
  }
  ```
- [ ] 1.2 In `devvit.json` scheduler block (after `check-events`), add:
  ```json
  "cleanup-aged": {
    "endpoint": "/internal/scheduler/cleanup-aged",
    "cron": "0 3 * * *"
  }
  ```

## 2. Shared: AppSettings type + ApiEndpoint + InternalEndpoint

- [ ] 2.1 In `src/shared/api.ts:31-36`, add `cleanup_after_days: number` and `pause_cleanup: boolean` to `AppSettings`.
- [ ] 2.2 In `src/shared/api.ts:68-89`, add `CleanupAged: "/api/cleanup-aged"` to `ApiEndpoint`.
- [ ] 2.3 In `src/server/server.ts:163-168`, add `CheckCleanupAged: "/internal/scheduler/cleanup-aged"` to `InternalEndpoint`.

## 3. Shared: pure helpers in meetit.ts

- [ ] 3.1 Add `isEventAgedOut(event: any, now: Date, thresholdDays: number, settingsTimezone: string): boolean`. Returns `false` if `event.date` or `event.time` is missing, or if `new Date(event.date + "T" + event.time + ":00" + settingsTimezone)` yields Invalid Date. Otherwise returns `(now - eventInstant) > thresholdDays * 86_400_000`. Uses the same timezone reconstruction as the existing `onCheckEvents` (server.ts:1136-1142) for consistency.
- [ ] 3.2 Add `isPitchAgedOut(pitch: any, now: Date, thresholdDays: number): boolean`. Returns `false` if `pitch.submittedAt` is missing or yields Invalid Date. Otherwise returns `(now - new Date(pitch.submittedAt)) > thresholdDays * 86_400_000`.
- [ ] 3.3 Add `pickAgedItems(events: any[], pitches: any[], now: Date, thresholdDays: number, settingsTimezone: string): { agedActiveEvents: any[]; agedPendingEvents: any[]; agedPitches: any[] }`. Splits events into active vs pending based on which hash they came from (the caller is responsible for separating them; this helper just receives them as two lists). Calls `isEventAgedOut` on each event and `isPitchAgedOut` on each pitch. The split is necessary because cleanup needs to call `hDel` on different hashes for active vs pending events.
- [ ] 3.4 Add `buildCleanupLogEntry(now: Date, counts: { eventsActive: number; eventsPending: number; pitches: number }): string` that returns a JSON string. Pure and deterministic given the inputs.

## 4. Server: getSettings + onCleanupAged + switch

- [ ] 4.1 In `src/server/server.ts:224-242` `getSettings()`, add `settings.get("cleanup_after_days")` and `settings.get("pause_cleanup")` to the `Promise.all`. Return as `cleanup_after_days: Number(...) || 30` and `pause_cleanup: (...) === true`. Update the catch-block defaults.
- [ ] 4.2 In the switch router (line ~136), add `case ApiEndpoint.CleanupAged: body = await onCleanupAged(req); break;` and `case InternalEndpoint.CheckCleanupAged: body = await onCleanupAged(req); break;`. (Both routes go to the same handler.)
- [ ] 4.3 Implement `onCleanupAged(req)`:
  1. **Lock check** (CRON path only): if the request URL is `/internal/scheduler/cleanup-aged`, attempt `redis.hSetNX("meetit:cleanup_lock", "lock", Date.now().toString())`. If it returns false, log `[CLEANUP] auto CRON skipped: lock held by another instance` and return `{ status: "ok", skipped: true }`. Set `redis.expire("meetit:cleanup_lock", 300)` (5-min TTL).
  2. **Auth check** (manual path only): if the request URL is `/api/cleanup-aged`, call `requireMod()`. Return 403 if not a mod.
  3. **Read settings**: `appSettings = await getSettings()`. Validate `cleanup_after_days` is in `[1, 365]`. If not, log `[CLEANUP] invalid threshold=${days}, must be 1-365` and return `{ error: "Invalid threshold", status: 400 }`.
  4. **Pause check** (CRON path only): if `appSettings.pause_cleanup === true`, log `[CLEANUP] skipped: pause_cleanup=true` and return success (no-op).
  5. **Log start**: if CRON, log `[CLEANUP] auto CRON tick (threshold=${days}d, pause=${pause})`. If manual, log `[CLEANUP] manual trigger by u/{user} (threshold=${days}d, pause=${pause})`.
  6. **Read data**: `activeEvents = await redis.hGetAll("meetit:active_events")`, `pendingEvents = await redis.hGetAll("meetit:pending_events")`, `pitches = await redis.hGetAll("meetit:pitched_ideas")`. Convert to lists via `safeJSONParse`.
  7. **Pick aged items**: `pickAgedItems([...activeEventsList, ...pendingEventsList], pitchesList, new Date(), days, appSettings.timezone)`. But the helper signature takes events as one list, so the caller splits active vs pending first.
  8. **Delete aged events**:
     - For each aged active event: `redis.hDel("meetit:active_events", [event.id])` + `redis.del("meetit:rsvps:" + event.id)` + `redis.del("meetit:rsvp_details:" + event.id)`.
     - For each aged pending event: `redis.hDel("meetit:pending_events", [event.id])`.
  9. **Delete aged pitches**: `redis.hDel("meetit:pitched_ideas", agedPitchIds)`.
  10. **Write audit log**: `redis.zAdd("meetit:cleanup_log", { score: now, member: buildCleanupLogEntry(now, counts) })`. Then trim: `redis.zRemRangeByRank("meetit:cleanup_log", 0, -51)` (keep latest 50).
  11. **Log finish**: `[CLEANUP] done: events active=${n} pending=${m}, pitches=${k} (threshold=${days}d, took=${ms}ms)`. If counts are all 0, log `[CLEANUP] done: nothing to clean (events=${total} pitches=${total})` instead.
  12. Return success with the counts.

## 5. Client: "Run cleanup now" button

- [ ] 5.1 In `src/client/app.ts`, add a new function `runCleanupAged()` mirroring `dismissIdea`/`approveIdea` structure: lock guard (`k = "cleanup-aged"`), confirm overlay (reuses `confirmDestructive` with the threshold preview: `"Run cleanup now? This will hard-delete events older than ${days} days and pitches older than ${days} days. This cannot be undone."`), `POST /api/cleanup-aged`, on success show toast with counts, on error show toast.
- [ ] 5.2 In the mod dashboard, add a "🧹 Run cleanup now" button. The button sits in a new section in the mod dashboard, just below the existing tab navigation. Add a small status text showing "Last cleanup: {date}" when available (reads from the cleanup log zset via a new endpoint or just omits the date on first run).
- [ ] 5.3 Add a small banner when `pause_cleanup=true` is active: "⚠️ Auto cleanup is paused — only manual cleanup will run." The banner is visible in the mod dashboard.
- [ ] 5.4 Add action handler: `case "run-cleanup-aged": runCleanupAged(); break;`

## 6. Tests (in tools/meetit-behavior.test.ts)

- [ ] 6.1 `isEventAgedOut` boundary: event with `date` 30 days in the past is NOT aged (boundary). 30 days + 1 second IS aged.
- [ ] 6.2 `isEventAgedOut` missing date: returns `false` (defensive skip, not aged).
- [ ] 6.3 `isEventAgedOut` invalid time: returns `false`.
- [ ] 6.4 `isEventAgedOut` timezone offset: a 2026-06-26 10:00 IST event aged against a UTC `now` produces the expected age.
- [ ] 6.5 `isPitchAgedOut` boundary: 30 days exact is NOT aged, 30 days + 1s IS.
- [ ] 6.6 `isPitchAgedOut` missing submittedAt: returns `false`.
- [ ] 6.7 `isPitchAgedOut` for approved pitch: returns true if the submittedAt is old enough (status doesn't matter for aging).
- [ ] 6.8 `pickAgedItems` splits correctly: returns aged events in `agedActiveEvents`/`agedPendingEvents` and aged pitches in `agedPitches` based on the input lists.
- [ ] 6.9 `buildCleanupLogEntry` is deterministic: same inputs → same output, includes timestamp and counts.

## 7. Verification

- [ ] 7.1 `npm test` — 93/93 still pass + 8-9 new = 101-102 total.
- [ ] 7.2 `npx openspec validate --all` — passes (46 → 47).
- [ ] 7.3 Manual playtest (2 devices):
  - Set `cleanup_after_days=1` temporarily via devvit settings (or just submit a test event with `event.date` = yesterday).
  - As mod, click "🧹 Run cleanup now" → confirm overlay → see toast with counts.
  - Verify the aged event/pitch is gone from `/api/home` and `/api/pitched-ideas`.
  - Verify the `meetit:cleanup_log` zset has a new entry (via the in-app debug panel or `devvit-cli logs`).
  - Set `pause_cleanup=true` → click "🧹 Run cleanup now" again → confirm it STILL runs (manual overrides pause).
  - Wait for the auto CRON tick (or trigger it via a manual call to the internal endpoint) with `pause_cleanup=true` → verify the CRON skips but the manual still works.
- [ ] 7.4 Add Test 8 to `TEST_CASES.md` results table.
