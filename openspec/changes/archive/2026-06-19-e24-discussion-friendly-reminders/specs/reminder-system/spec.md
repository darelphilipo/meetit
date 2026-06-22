## ADDED Requirements

### Requirement: Reminder posts use textFallback for cross-client readability
The system SHALL create reminder posts using `reddit.submitCustomPost({ textFallback: { text: ... } })` so the body renders on old.reddit, third-party mobile apps, search engines, AutoModerator, and Reddit safety filters — not just inside the app iframe.

#### Scenario: Reminder post created with textFallback
- **WHEN** the CRON in `onCheckEvents` creates a reminder post for an upcoming event
- **THEN** the post has a `textFallback.text` field containing a markdown body
- **AND** the body includes an `## 📅` section header with the event date
- **AND** the body includes an `## ⏰` section header with the event time
- **AND** the post is NOT created with `userGeneratedContent` (reserved for `runAs: 'USER'` flows)

### Requirement: Reminder body lists organizer as u/username mention
The system SHALL include `**Organized by:** u/${organizer}` in the reminder body so attendees can reach the organizer via direct message and start a discussion thread.

#### Scenario: Organizer is set on the event
- **WHEN** `event.organizer` is non-empty
- **THEN** the body contains `**Organized by:** u/${event.organizer}`

#### Scenario: Organizer is missing from the event
- **WHEN** `event.organizer` is empty or undefined
- **THEN** the body contains `**Organized by:** u/${context.username}` (fallback to app account)

### Requirement: Reminder body lists configured moderators as u/username mentions
The system SHALL include `**Moderators:** u/mod1 u/mod2 ...` in the reminder body when at least one moderator is configured in the `mod_usernames` setting, so attendees can reach mods from the post.

#### Scenario: mod_usernames setting is populated
- **WHEN** the `mod_usernames` setting is a non-empty comma-separated list
- **THEN** the body contains `**Moderators:** ` followed by `u/username` for each configured mod, separated by spaces

#### Scenario: mod_usernames setting is empty
- **WHEN** the `mod_usernames` setting is empty or unset
- **THEN** the body does NOT include a `**Moderators:**` line

### Requirement: Reminder posts support a 1-hour post-start retry window
The system SHALL post reminders for events whose start time is within `reminder_hours` before OR up to 1 hour after the event start time. The dedup flag `meetit:reminded:${eventId}` SHALL be set ONLY AFTER the `submitCustomPost` call resolves successfully, so a failed post retries on the next CRON tick.

#### Scenario: Event starts within 1 hour of CRON run
- **WHEN** `hoursUntilEvent` is between `-1` and `reminder_hours` (inclusive) and the event has not been reminded yet
- **THEN** the system posts a reminder and sets the `remindedKey` with a 24h TTL

#### Scenario: Event has been reminded in the last 24h
- **WHEN** `meetit:reminded:${eventId}` is set in Redis
- **THEN** the system skips this event and does NOT create a duplicate reminder

#### Scenario: submitCustomPost throws
- **WHEN** `submitCustomPost` rejects with an error
- **THEN** the system does NOT set `meetit:reminded:${eventId}`
- **AND** the next CRON run (≤5 minutes later) retries the reminder
- **AND** logs `[CRON] Post failed: ${error}` for debugging

#### Scenario: submitCustomPost succeeds
- **WHEN** `submitCustomPost` resolves with a post object
- **THEN** the system sets `meetit:reminded:${eventId}` with a 24h TTL
- **AND** logs `[CRON] Reminder post sent for ${event.title} (postId=${post.id})`
