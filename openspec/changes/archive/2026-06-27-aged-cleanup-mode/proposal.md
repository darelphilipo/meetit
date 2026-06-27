## Why

The app accumulates data over time. Events live forever in `meetit:active_events` even after they happen 6+ months ago. Pitches (pending, dismissed, AND approved) live in `meetit:pitched_ideas` indefinitely. There is no time-based cleanup — only explicit user/mod action removes anything.

Result: a subreddit that's been running for a year has 100s of past events cluttering the home view, 1000s of dead pitches in Redis, and no way to trim them without a manual sweep. The `fix-bug6-past-event-rsvp-block` proposal (2026-06-19) explicitly noted: "If a past event is still in `meetit:active_events` (no cleanup), `getActiveEvent` returns it and RSVP proceeds without any date check." This change fixes that risk at the source.

The minimal fix: a daily cleanup CRON that hard-deletes aged events and pitches based on a configurable threshold. Aged means:
- **Events**: `event.date` is more than N days in the past (the meetup happened a long time ago — no one is RSVPing to a meetup from 2 months ago)
- **Pitches**: `submittedAt` is more than N days ago (any status — pending pitches that have been sitting in the queue for 90 days are noise; approved pitches that the user never converted to events are also noise)

Mods can pause the auto CRON (e.g. before a big release) and run it manually with a button. The threshold is configurable per-install (default 30 days). The cleanup is logged to an audit zset so mods can see what was removed.

## Priority: 1/5

## Status: proposed

## What Changes

- Two new App Installation Settings: `cleanup_after_days` (default 30, range 1-365) and `pause_cleanup` (default false).
- New daily CRON `cleanup-aged` at `0 3 * * *` (03:00 UTC) that hard-deletes aged items. Skipped when `pause_cleanup=true`.
- New mod-only manual endpoint `POST /api/cleanup-aged` with a "🧹 Run cleanup now" button in the mod dashboard. Same handler as the CRON.
- Pure helpers in `meetit.ts`: `isEventAgedOut`, `isPitchAgedOut`, `pickAgedItems`. All testable, all defensive (return `false` for malformed dates, not `true`).
- Per-event cleanup: deletes the event from active/pending hash + the RSVP set/details hash (mirrors `onDeletePublished`).
- Per-pitch cleanup: `hDel` from `meetit:pitched_ideas` (any status — pending, dismissed, approved all eligible).
- Audit log: `meetit:cleanup_log` zset, capped at 50 most recent runs. Each entry is `{timestamp, counts}` JSON.
- Distributed lock: `meetit:cleanup_lock` with 5-min TTL via `hSetNX`. Separate from the existing `meetit:cron_lock` so the cleanup can run even if `check-events` is mid-flight.
- Threshold validation: server rejects `cleanup_after_days < 1 || > 365` with 400.

## Capabilities

### New Capabilities
- `aged-cleanup-mode`: The system runs a daily cleanup that hard-deletes events with `event.date` more than N days in the past and pitches with `submittedAt` more than N days ago. The threshold is configurable in App Installation Settings. The auto CRON can be paused. Mods can run the cleanup manually from a button. The cleanup is logged to an audit zset.

### Modified Capabilities
- None.

## Impact

- `devvit.json` (settings): add `cleanup_after_days` and `pause_cleanup`.
- `devvit.json` (scheduler): add `cleanup-aged` task with cron `0 3 * * *`.
- `src/shared/api.ts`: add `CleanupAged: "/api/cleanup-aged"` to `ApiEndpoint`; add the two new settings to `AppSettings`.
- `src/shared/meetit.ts`: add 3 pure helpers + 1 builder for the cleanup log entry.
- `src/server/server.ts`: new `onCleanupAged` handler, new `CleanupAged` + `CheckCleanupAged` cases in the router, internal endpoint constant.
- `src/client/app.ts`: new `runCleanupAged()` function, new "🧹 Run cleanup now" button in the mod dashboard section, action handler.
- `public/app.html`: no change (button is added via JS to the existing mod dashboard section).
- `tools/meetit-behavior.test.ts`: 8-10 new tests for the pure helpers (boundary at 30d, +1s, timezone offset, missing fields, approved-pitches count).
- `TEST_CASES.md`: add Test 8 (Aged Cleanup Mode) with 6-8 steps.

## Note

This is the minimal cleanup. It does NOT include:
- "Archive" view for soft-deleted items (the user wants permanent deletion, not archive)
- Per-user cleanup of MY STUFF (pitches/events the user owns but the cleanup still removes from Redis — the user sees it as "your pitch/event vanished after 30 days")
- Cleanup notifications (we don't DM the user when their old pitch is deleted)
- Mod-configurable per-bucket thresholds (events and pitches share the same `cleanup_after_days` setting)

The rollout is **2 phases within this PR**:
- **Phase A (this PR)**: helpers + manual button + auto CRON. Ship and verify in playtest.
- **Phase B (NOT in this PR, future follow-up)**: per-bucket thresholds, archive view, etc.

The defensive `isEventAgedOut` returns `false` (skip, don't delete) when `event.date` or `event.time` is missing or `new Date(...)` yields Invalid Date. A typo in a date field would otherwise silently wipe the event. The skip is logged as a warning so mods can see why an event wasn't cleaned.
