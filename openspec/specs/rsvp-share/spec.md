# rsvp-share Specification

## Purpose
RSVP share feature — creates a Reddit post announcing attendance at an event, with USER→APP fallback, 24h dedup, attendee list section, and draft-preview overlay for consent.

## Requirements
### Requirement: RSVP success card shows a "Share that I'm going" button
After a successful RSVP submission, the confirmation card SHALL display a "🎉 Share that I'm going" button alongside the existing "📋 Copy Details" and "Done →" buttons. Tapping it SHALL open a draft-preview overlay showing the exact post that will be created.

#### Scenario: User taps the share button on the success card
- **WHEN** the user taps the "🎉 Share that I'm going" button in the RSVP success card
- **THEN** the draft-preview overlay opens
- **AND** the overlay shows the exact post title and body that will be created
- **AND** the overlay has a "Post to Reddit →" primary button and a "Cancel" secondary button

#### Scenario: User cancels the share preview
- **WHEN** the user taps "Cancel" in the draft-preview overlay
- **THEN** the overlay closes
- **AND** no post is created
- **AND** the user returns to the RSVP success card

### Requirement: Share post is created under the user's account with graceful fallback
The system SHALL create the share post using `runAs: 'USER'` when the app has been granted the `SUBMIT_POST` user-action permission. If the `runAs: 'USER'` call fails (e.g., permission pending approval), the system SHALL fall back to `runAs: 'APP'` and include the `postedAs` field in the response so the client can inform the user.

#### Scenario: App has SUBMIT_POST permission
- **WHEN** the user confirms the share
- **THEN** the server calls `reddit.submitPost({ ..., runAs: 'USER', userGeneratedContent: { text: ... } })`
- **AND** the post is created under the user's Reddit account
- **AND** the response includes `postedAs: "USER"`

#### Scenario: App is pending SUBMIT_POST approval
- **WHEN** the `runAs: 'USER'` call throws
- **THEN** the server falls back to `reddit.submitPost({ ..., runAs: 'APP' })` (no `userGeneratedContent`)
- **AND** the post is created under the Meetit app account
- **AND** the response includes `postedAs: "APP"`
- **AND** the user is informed via a non-blocking toast

### Requirement: Share post has a deterministic format with event details and Meetit branding
The system SHALL build the share post using a fixed template: title `u/${username} is going to ${event.title} (${event.date})`, body containing date, time, location, optional Google Maps link, optional description (truncated to 300 chars), and a "Posted via Meetit" footer link.

#### Scenario: Full event details
- **WHEN** the event has all fields populated (title, date, time, location, description, mapUrl)
- **THEN** the post body contains all six sections in the documented order
- **AND** the title uses the username (without `u/` prefix) followed by "is going to"

#### Scenario: Event missing optional fields
- **WHEN** the event is missing mapUrl or description
- **THEN** those sections are omitted from the body
- **AND** the post is still valid and posts successfully

#### Scenario: Description is too long
- **WHEN** `event.description` is longer than 300 characters
- **THEN** the body truncates the description to 300 characters and appends "…"

### Requirement: Share post includes other attendees list
The share post body SHALL include an "Also going" section listing other users who have RSVPed to the same event. The list SHALL be capped at 20 attendees with "+N more" notation, sorted case-insensitively alphabetically, deduplicated, and with `u/` prefix stripped.

#### Scenario: Share with 3 other attendees
- **WHEN** the user shares an event with 3 other RSVPed users
- **THEN** the post body contains `**Also going (3):** u/alice u/bob u/charlie`
- **AND** the attendees are sorted alphabetically (case-insensitive)
- **AND** the current user's username is excluded from the list

#### Scenario: Share with 25 other attendees (cap hit)
- **WHEN** the user shares an event with 25 other RSVPed users
- **THEN** the post body lists 20 attendees followed by `+5 more`
- **AND** the list is capped at 20 entries

#### Scenario: Share with no other attendees
- **WHEN** the user is the only RSVPed user
- **THEN** the "Also going" section is omitted entirely
- **AND** the post body does not contain an empty attendee list

### Requirement: Share is rate-limited to once per (eventId, username) per 24 hours
The system SHALL set a Redis key `meetit:rsvp_share:${eventId}:${username}` with a 24h TTL after a successful share. The dedup key SHALL be set ONLY after validating the post URL (to prevent stuck state if the post creation fails).

#### Scenario: First share within 24h
- **WHEN** the user has not shared this event in the last 24h
- **THEN** the share post is created
- **AND** the Redis key is set with 24h TTL
- **AND** the response indicates success

#### Scenario: Duplicate share within 24h
- **WHEN** the user attempts to share the same event again within 24h
- **THEN** the server returns `{ success: false, reason: "already_shared" }` without creating a post
- **AND** the client shows a "You already shared this event today" toast

#### Scenario: Share a different event
- **WHEN** the user RSVPs to a different event and shares it
- **THEN** the dedup key is different (includes the new eventId)
- **AND** the share succeeds normally

