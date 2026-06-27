# event-dm-notifications Specification

> **Status: DEFERRED (2026-06-27).** No implementation work planned for v1.0. See `proposal.md` for the deferral reason. The spec is retained for future implementation. When this is re-proposed for active work, this header should be removed and the change should be moved out of the "deferred" bucket.

## Purpose

Private message notifications for event-related events. The app's DM system is established (pitch submission and pitch approval both use it); this spec extends it to (1) 24h RSVP reminders, (2) event approval confirmation, and (3) event dismissal notification. All DMs are best-effort: a Reddit API failure logs a warning but never blocks the primary action (public post, approval, or deletion).

## ADDED Requirements

### Requirement: 24h RSVP reminder DM
The system MUST send a private message to every user who has RSVPed to an event, exactly once per event per 24h window, when the 24h public reminder post is created. The DM MUST include the event title, the event date and time, the organizer's `u/username`, and a friendly "hope to see you there" closing.

#### Scenario: 24h reminder fires for an event with 5 RSVPs
- **WHEN** the CRON creates a 24h public reminder post for an event
- **AND** 5 users have RSVPed to that event
- **THEN** each of the 5 users receives exactly one private message with subject `📅 Reminder: {eventTitle} is tomorrow!`
- **AND** the body contains the event title, the event date, the event time, and `u/{organizer}`
- **AND** the body contains the line `Hope to see you there!`
- **AND** a server log line tagged `[DM-RSVPT-24H]` is emitted for each successful DM

#### Scenario: 24h DM dedup prevents duplicate sends
- **WHEN** the 24h reminder CRON runs twice within 25h for the same event
- **THEN** each RSVPed user receives the DM at most once
- **AND** the second run emits `[DM-RSVPT-24H-SKIP]` log lines for already-DMed users

#### Scenario: 24h DM failure does not block the public post
- **WHEN** the 24h public reminder post is created successfully
- **AND** a DM send to one RSVPed user fails
- **THEN** the public post is still published
- **AND** the remaining users still receive their DMs
- **AND** a server log line tagged `[DM-RSVPT-24H-FAIL]` is emitted for the failed send

#### Scenario: Event has no RSVPs at 24h mark
- **WHEN** the 24h reminder CRON fires for an event with zero RSVPs
- **THEN** no DMs are sent
- **AND** a server log line tagged `[DM-RSVPT-24H-BATCH]` is emitted with `recipients=0`

### Requirement: Event approval DM to submitter
The system MUST send a private message to the event submitter when a moderator approves a pending event. The DM confirms the event is now live and references the public announcement post.

#### Scenario: Mod approves a pending event
- **WHEN** a moderator calls `/api/approve-event` for a pending event
- **AND** the event has a non-empty `submittedBy` field
- **THEN** the submitter receives a private message with subject `✅ Your event "{eventTitle}" is live!`
- **AND** the body confirms the event is now visible to the community
- **AND** a server log line tagged `[DM-EVT-APPROVE]` is emitted

#### Scenario: Event approval DM failure does not block the approval
- **WHEN** the public announcement post is created successfully
- **AND** the approval DM send fails
- **THEN** the event is still approved and visible
- **AND** a server log line tagged `[DM-EVT-APPROVE-FAIL]` is emitted

#### Scenario: Event has no submitter username (legacy data)
- **WHEN** a mod approves an event with no `submittedBy` and no `organizer` field
- **THEN** no DM is sent
- **AND** a server warning log is emitted (not `[DM-EVT-APPROVE-FAIL]` — the absence is data-related, not a Reddit API failure)

### Requirement: Event dismissal DM to submitter (mod action only)
The system MUST send a private message to the event submitter when a moderator (not the owner) deletes a pending event. The DM MUST include an optional reason from the mod. The DM MUST NOT be sent when the event owner deletes their own event.

#### Scenario: Mod deletes a pending event with a reason
- **WHEN** a moderator calls `/api/delete-pending` for a pending event with a `reason` field in the request body
- **AND** the event has a non-empty `submittedBy` or `organizer` field
- **THEN** the submitter receives a private message with subject `❌ Your event wasn't approved`
- **AND** the body includes the reason line
- **AND** a server log line tagged `[DM-EVT-DISMISS]` is emitted with `hasReason=true`

#### Scenario: Mod deletes a pending event without a reason
- **WHEN** a moderator calls `/api/delete-pending` with no `reason` field
- **THEN** the submitter receives the dismissal DM without a reason line
- **AND** a server log line tagged `[DM-EVT-DISMISS]` is emitted with `hasReason=false`

#### Scenario: Owner deletes their own pending event (self-deletion)
- **WHEN** the event organizer (not a mod) calls `/api/delete-pending` for their own pending event
- **THEN** no DM is sent
- **AND** a server log line tagged `[DM-EVT-DISMISS-SKIP]` is emitted with `reason=self`

#### Scenario: Event dismissal DM failure does not block the deletion
- **WHEN** the deletion from `meetit:pending_events` succeeds
- **AND** the dismissal DM send fails
- **THEN** the deletion still takes effect
- **AND** a server log line tagged `[DM-EVT-DISMISS-FAIL]` is emitted

### Requirement: Username prefix normalization in DM bodies
The system MUST strip any `u/` prefix from usernames before rendering them in DM bodies. The body MUST show exactly one `u/` prefix (e.g., `Hi u/alice,` not `Hi u/u/alice,`).

#### Scenario: Recipient username has u/ prefix
- **WHEN** the recipient username passed to a DM helper is `u/alice`
- **THEN** the rendered body contains `Hi u/alice,` (single `u/` prefix)

#### Scenario: Recipient username has no u/ prefix
- **WHEN** the recipient username passed to a DM helper is `alice`
- **THEN** the rendered body contains `Hi u/alice,` (single `u/` prefix)

### Requirement: All DM sends are best-effort and audited
The system MUST wrap every `reddit.sendPrivateMessage()` call in a try/catch. On success, the system MUST emit an info-level log line. On failure, the system MUST emit a warn-level log line with the error message. The DM failure MUST NOT propagate as an exception to the caller.

#### Scenario: Reddit API returns 5xx
- **WHEN** `reddit.sendPrivateMessage` throws or returns an error
- **THEN** a warn-level log line is emitted
- **AND** the calling code continues to the next step
- **AND** the original action (public post, approval, deletion) is unaffected
