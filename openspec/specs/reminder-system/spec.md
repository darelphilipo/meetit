# reminder-system Specification

## Purpose
CRON-triggered reminder posts for upcoming events. The reminders are **plain text posts** (created via `reddit.submitPost()`) so the body shows on every Reddit client — not hidden behind an app iframe. This drives discussion in the comments and makes event details accessible to all Redditors.
## Requirements
### Requirement: Reminder posts are plain text posts (not custom app posts)
The system SHALL create reminder posts using `reddit.submitPost({ title, text, subredditName? })` so the body renders on every Reddit client (new.reddit, old.reddit, official mobile, third-party apps, search, AutoMod). The post SHALL NOT be created via `reddit.submitCustomPost()` which would always render the Meetit app iframe and hide the body.

#### Scenario: Reminder post created as plain text post
- **WHEN** the CRON in `onCheckEvents` creates a reminder post for an upcoming event
- **THEN** the post is created via `reddit.submitPost({ title, text })`
- **AND** the `text` field contains a markdown body with event details
- **AND** the body includes an `## 📅` section header with the event date
- **AND** the body includes an `## ⏰` section header with the event time

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

### Requirement: Reminder body includes attendee list
The reminder body SHALL include a `**👥 N going:**` section listing users who have RSVPed to the event. The list SHALL be capped at 20 attendees with "+N more" notation, sorted case-insensitively alphabetically, deduplicated, and with `u/` prefix stripped.

#### Scenario: Event with 5 RSVPed attendees
- **WHEN** the CRON creates a reminder for an event with 5 RSVPed users
- **THEN** the body contains `**👥 5 going:** u/alice u/bob u/charlie ...`
- **AND** the attendees are sorted alphabetically (case-insensitive)

#### Scenario: Event with 25 attendees (cap hit)
- **WHEN** the CRON creates a reminder for an event with 25 RSVPed users
- **THEN** the body lists 20 attendees followed by `+5 more`

#### Scenario: Event with no RSVPs (only organizer)
- **WHEN** the CRON creates a reminder for an event with no RSVPs (or only the organizer)
- **THEN** the "👥 going" section is omitted entirely
- **AND** the body does not contain an empty attendee list

### Requirement: Reminder body includes a deep link to the subreddit's Meetit app
The system SHALL include a `🚀 [Open in Meetit to RSVP](https://www.reddit.com/r/${subredditName})` line in the reminder body so attendees can find the Meetit app to RSVP. Since the post is a plain text post (no app iframe), this deep link is the entry point to the RSVP flow.

#### Scenario: Subreddit name is available in context
- **WHEN** `context.subredditName` is non-empty
- **THEN** the body contains `🚀 **[Open in Meetit to RSVP](https://www.reddit.com/r/${subredditName})**`

#### Scenario: Subreddit name is missing from context
- **WHEN** `context.subredditName` is empty or undefined
- **THEN** the body does NOT include the deep link line

### Requirement: Reminder posts support a 1-hour post-start retry window
The system SHALL post reminders for events whose start time is within `reminder_hours` before OR up to 1 hour after the event start time. The dedup flag `meetit:reminded:${eventId}` SHALL be set ONLY AFTER the `submitPost` call resolves successfully, so a failed post retries on the next CRON tick.

#### Scenario: Event starts within 1 hour of CRON run
- **WHEN** `hoursUntilEvent` is between `-1` and `reminder_hours` (inclusive) and the event has not been reminded yet
- **THEN** the system posts a reminder and sets the `remindedKey` with a 24h TTL

#### Scenario: Event has been reminded in the last 24h
- **WHEN** `meetit:reminded:${eventId}` is set in Redis
- **THEN** the system skips this event and does NOT create a duplicate reminder

#### Scenario: submitPost throws
- **WHEN** `submitPost` rejects with an error
- **THEN** the system does NOT set `meetit:reminded:${eventId}`
- **AND** the next CRON run (≤5 minutes later) retries the reminder
- **AND** logs `[CRON] Post failed for ${event.title}: ${error}` for debugging

#### Scenario: submitPost succeeds
- **WHEN** `submitPost` resolves with a post object
- **THEN** the system sets `meetit:reminded:${eventId}` with a 24h TTL
- **AND** logs `[CRON] Reminder post sent for ${event.title} (postId=${post.id})`

### Requirement: Reminder body includes a Google Maps link when event.mapUrl is set
The reminder body SHALL include a `## 🗺️` section with a clickable Google Maps link when `event.mapUrl` is non-empty. The section SHALL be omitted entirely when the maps URL is empty, whitespace, or missing.

#### Scenario: Event has a Google Maps URL
- **WHEN** `event.mapUrl` is a non-empty string
- **THEN** the body contains `## 🗺️ [Open in Google Maps](${event.mapUrl})` rendered as a markdown heading + link

#### Scenario: Event has no Google Maps URL
- **WHEN** `event.mapUrl` is empty, whitespace, or missing
- **THEN** the body does NOT include a `## 🗺️` section

### Requirement: Reminder deep link points to the stored Meetit app post
The reminder body SHALL deep-link to the most recent Meetit app launcher post (created via the `Create Meetit Post` menu action) when one exists in Redis. The launcher post ID SHALL be persisted to `meetit:meetit_app_post_id` whenever `onMenuCreatePost` succeeds.

#### Scenario: Launcher post exists in Redis
- **WHEN** `meetit:meetit_app_post_id` is set in Redis
- **THEN** the body contains `🚀 **[Open in Meetit to RSVP](https://www.reddit.com/comments/${postId}/)**` pointing to the launcher post

#### Scenario: No launcher post in Redis
- **WHEN** `meetit:meetit_app_post_id` is empty or missing (fresh install, no mod has clicked "Create Meetit Post" yet)
- **THEN** the body falls back to the subreddit homepage (`https://www.reddit.com/r/${subredditName}`) with a hint for mods: "create a Meetit post first, then the link will go straight to the app"

#### Scenario: onMenuCreatePost persists the post ID
- **WHEN** `onMenuCreatePost` successfully creates a custom app post
- **THEN** the system writes `post.id` to `meetit:meetit_app_post_id` in Redis
- **AND** the post creation flow (navigateTo) proceeds normally even if the Redis write fails (graceful degradation)

### Requirement: Second reminder window at reminder_hours_2 hours before event
The system SHALL post a second reminder for each event at `reminder_hours_2` hours before the event start time, in addition to the existing 24h reminder. The setting defaults to 2 (hours). Mods SHALL be able to disable the second reminder by setting `reminder_hours_2` to 0.

#### Scenario: Default 2h window is active
- **WHEN** `reminder_hours_2` is left at its default value of 2
- **AND** an event is 1.5h away
- **THEN** the system posts a "⏰ Starting Soon:" reminder for that event

#### Scenario: Mod disables the 2h window
- **WHEN** a mod sets `reminder_hours_2` to 0 in the subreddit settings
- **THEN** only the 24h reminder fires (existing behavior preserved)

#### Scenario: Mod customizes the 2h window
- **WHEN** a mod sets `reminder_hours_2` to 12
- **THEN** the second reminder fires at 12h before the event (not hardcoded to 2)

### Requirement: Per-window dedup keys prevent duplicate posts
The system SHALL use a separate Redis dedup key for each reminder window. The 24h window uses `meetit:reminded:${eventId}:24h` and the 2h window uses `meetit:reminded:${eventId}:2h`. Both keys SHALL have a 24h TTL set after a successful post.

#### Scenario: Both windows can fire in the same CRON run
- **WHEN** a last-minute event is 1.5h away
- **AND** neither the 24h nor the 2h reminder has fired yet
- **THEN** the CRON posts BOTH reminders in the same run (one per window, each with its own title)

#### Scenario: Re-fire prevented by per-window dedup
- **WHEN** the 24h reminder has already been posted for an event
- **THEN** on the next CRON tick, the 24h reminder does NOT fire again
- **AND** the 2h reminder CAN still fire if its window has opened and its own dedup key is unset

#### Scenario: Failed post does not set dedup flag
- **WHEN** `submitPost` rejects for either window
- **THEN** the corresponding per-window dedup key is NOT set
- **AND** the next CRON run (≤5 minutes later) retries that window

### Requirement: Different title prefixes per window
The 24h reminder SHALL use the title prefix `🔔 Event Reminder:` and the 2h reminder SHALL use `⏰ Starting Soon:`. The body markdown is identical between windows; only the title prefix differs.

#### Scenario: 24h reminder title
- **WHEN** the 24h reminder fires for an event titled "Coffee Meetup" on 2026-06-25 at "Central Park"
- **THEN** the post title is `🔔 Event Reminder: Coffee Meetup — 2026-06-25 @ Central Park`

#### Scenario: 2h reminder title
- **WHEN** the 2h reminder fires for the same event
- **THEN** the post title is `⏰ Starting Soon: Coffee Meetup — 2026-06-25 @ Central Park`

#### Scenario: Body is identical between windows
- **WHEN** the same event triggers both windows in the same CRON run
- **THEN** both posts have the same body markdown (date, time, location, attendees, organizer, deep link)
- **AND** only the title prefix differs

