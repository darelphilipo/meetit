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

