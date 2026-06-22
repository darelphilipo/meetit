## ADDED Requirements

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
