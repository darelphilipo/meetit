## ADDED Requirements

### Requirement: Aged cleanup runs daily
The system SHALL run a daily cleanup at 03:00 UTC (cron `0 3 * * *`) that hard-deletes events and pitches older than the configured `cleanup_after_days` threshold. The cleanup uses a distributed lock (`meetit:cleanup_lock` with 5-min TTL) to prevent overlapping runs.

#### Scenario: Auto CRON tick fires
- **WHEN** the cron tick fires at 03:00 UTC
- **THEN** the system attempts to acquire `meetit:cleanup_lock` via `hSetNX`
- **AND** if the lock is held by another instance, the system logs `[CLEANUP] auto CRON skipped: lock held by another instance` and returns success without running
- **AND** if the lock is acquired, the system sets a 5-min TTL and proceeds with the cleanup
- **AND** the system logs `[CLEANUP] auto CRON tick (threshold=${days}d, pause=${pause})` at the start

#### Scenario: Auto CRON respects pause setting
- **WHEN** the cron tick fires
- **AND** the `pause_cleanup` App Installation Setting is `true`
- **THEN** the system logs `[CLEANUP] skipped: pause_cleanup=true`
- **AND** the system returns success without deleting anything
- **AND** the manual button is NOT affected (the pause only freezes the auto CRON)

### Requirement: Mod can run cleanup manually
The system SHALL provide a `POST /api/cleanup-aged` endpoint, mod-gated via `requireMod()`, that runs the same cleanup logic as the auto CRON. The endpoint is callable from a "🧹 Run cleanup now" button in the mod dashboard.

#### Scenario: Mod clicks Run cleanup now
- **WHEN** a moderator clicks "🧹 Run cleanup now" in the mod dashboard
- **AND** confirms the action in the overlay
- **THEN** the client calls `POST /api/cleanup-aged`
- **AND** the server runs the same cleanup as the auto CRON
- **AND** the server returns the counts of items deleted: `{ events: { active, pending }, pitches: { total } }`
- **AND** the client shows a toast with the counts

#### Scenario: Non-mod cannot trigger manual cleanup
- **WHEN** a non-moderator calls `POST /api/cleanup-aged`
- **THEN** the server returns 403 Forbidden
- **AND** no items are deleted

#### Scenario: Manual cleanup ignores pause setting
- **WHEN** a moderator clicks "🧹 Run cleanup now" while `pause_cleanup=true`
- **THEN** the cleanup runs (the pause only affects the auto CRON)
- **AND** the system logs `[CLEANUP] manual trigger by u/{user} (threshold=${days}d, pause=true)` at the start

### Requirement: Aged events are hard-deleted
The system SHALL hard-delete events whose `event.date` is more than `cleanup_after_days` in the past. "In the past" means the event's instant (reconstructed as `new Date(event.date + "T" + event.time + ":00" + settingsTimezone)`) is at least `cleanup_after_days * 86_400_000` milliseconds before `now`.

#### Scenario: Past event is deleted
- **WHEN** an event has `date = "2026-05-01"`, `time = "10:00"`, and the current date is 2026-06-26 with `cleanup_after_days = 30`
- **THEN** the event is at least 30 days in the past
- **AND** the cleanup deletes it from `meetit:active_events`
- **AND** the cleanup also deletes `meetit:rsvps:{eventId}` and `meetit:rsvp_details:{eventId}`

#### Scenario: Pending event past its date is deleted
- **WHEN** an event in `meetit:pending_events` has `date` more than `cleanup_after_days` in the past
- **THEN** the cleanup deletes it from `meetit:pending_events`
- **AND** no RSVP side effects (pending events don't have RSVPs)

#### Scenario: Defensive skip for missing or invalid date
- **WHEN** an event has no `date` field, or `time` is missing, or `new Date(...)` yields Invalid Date
- **THEN** `isEventAgedOut` returns `false` (the event is NOT cleaned)
- **AND** the system logs `[CLEANUP] skipping event {id}: missing/invalid date (date="${date}" time="${time}")` as a warning

#### Scenario: Future event is never cleaned
- **WHEN** an event has `date` in the future
- **THEN** the event is never deleted by the cleanup, regardless of `submittedAt` (the cleanup uses the event's scheduled date, not its submission date)

### Requirement: Aged pitches are hard-deleted
The system SHALL hard-delete pitches whose `submittedAt` is more than `cleanup_after_days` in the past, regardless of `status` (pending, dismissed, and approved pitches are all eligible).

#### Scenario: Old pending pitch is deleted
- **WHEN** a pitch has `submittedAt` more than `cleanup_after_days` ago and `status="pending"`
- **THEN** the cleanup deletes it from `meetit:pitched_ideas`

#### Scenario: Old dismissed pitch is deleted
- **WHEN** a pitch has `submittedAt` more than `cleanup_after_days` ago and `status="dismissed"`
- **THEN** the cleanup hard-deletes it (the soft-dismissed row is now permanently removed)

#### Scenario: Old approved pitch is deleted
- **WHEN** a pitch has `submittedAt` more than `cleanup_after_days` ago and `status="approved"`
- **THEN** the cleanup hard-deletes it (the approved-but-never-converted row is now permanently removed)

#### Scenario: Defensive skip for missing submittedAt
- **WHEN** a pitch has no `submittedAt` field, or the value yields Invalid Date
- **THEN** `isPitchAgedOut` returns `false`
- **AND** the system logs `[CLEANUP] skipping pitch {id}: missing submittedAt` as a warning

### Requirement: Threshold is configurable and validated
The system SHALL read `cleanup_after_days` from the App Installation Settings on every cleanup run. The value MUST be in the range `[1, 365]` (inclusive). Out-of-range values are rejected with 400.

#### Scenario: Default threshold is 30 days
- **WHEN** the `cleanup_after_days` setting is not set (fresh install)
- **THEN** the cleanup uses 30 days as the threshold

#### Scenario: Threshold of 0 is rejected
- **WHEN** the server reads `cleanup_after_days` and the value is `0`
- **THEN** the server returns 400 with the error "Invalid threshold"
- **AND** the server logs `[CLEANUP] invalid threshold=0, must be 1-365`

#### Scenario: Threshold of 366 is rejected
- **WHEN** the server reads `cleanup_after_days` and the value is `366`
- **THEN** the server returns 400 with the error "Invalid threshold"
- **AND** the server logs `[CLEANUP] invalid threshold=366, must be 1-365`

### Requirement: Cleanup is logged to an audit zset
The system SHALL write a summary of every cleanup run to the `meetit:cleanup_log` Redis sorted set, capped at the 50 most recent entries. Each entry is a JSON string containing the timestamp and counts.

#### Scenario: Successful run is logged
- **WHEN** a cleanup run completes (whether items were deleted or not)
- **THEN** the system writes an entry to `meetit:cleanup_log` with `score = now` and `member = buildCleanupLogEntry(now, counts)`
- **AND** the system trims the zset to the 50 most recent entries (`zRemRangeByRank 0 -51`)
- **AND** the entry is also written to `meetit:server_logs` so it shows in the in-app debug panel

#### Scenario: Audit log entry format
- **WHEN** the system builds the audit log entry
- **THEN** the entry includes: `ts` (the current ISO timestamp), `events.active` (count of aged active events), `events.pending` (count of aged pending events), `pitches` (count of aged pitches), `thresholdDays`, `trigger` ("cron" or "manual"), `user` (the actor for manual, "system" for CRON)

### Requirement: Pause setting freezes auto CRON only
The system SHALL honor the `pause_cleanup` App Installation Setting by skipping the auto CRON when it is `true`. The manual button continues to work regardless of the setting.

#### Scenario: Pause banner shows in mod dashboard
- **WHEN** a moderator views the mod dashboard
- **AND** the `pause_cleanup` setting is `true`
- **THEN** a banner is visible: "⚠️ Auto cleanup is paused — only manual cleanup will run."
- **AND** the banner is hidden when the setting is `false`
