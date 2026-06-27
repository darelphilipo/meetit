# event-announcement-post Specification

## Purpose
TBD - created by archiving change event-announcement-post. Update Purpose after archive.
## Requirements
### Requirement: Mod approval creates an announcement post
The system SHALL create a public announcement post on the subreddit when a moderator approves an event. The post contains the full event details (date, time, location, map, calendar, description, organizer) and a "Drop a comment to plan, coordinate, or ask questions" framing.

#### Scenario: Mod approves a fully-filled event
- **WHEN** a moderator clicks "Approve & Publish" on a pending event
- **AND** the event has all fields filled (title, date, time, location, description, organizer)
- **THEN** the system posts a public announcement on the subreddit
- **AND** the post title is `📅 [New Meetup] ${title} — ${date} @ ${location}`
- **AND** the post body contains the event details + a discussion CTA
- **AND** the post URL is stored in Redis at `meetit:event_post:${eventId}`
- **AND** the server logs `[APPROVE] announcement post created url=${post.url} for ${event.title}`

#### Scenario: Mod approves an event without a location
- **WHEN** a moderator approves a pending event with no location
- **THEN** the post title is `📅 [New Meetup] ${title} — ${date}` (no `@ ${location}` suffix)
- **AND** the post body omits the location section

#### Scenario: Reddit API failure does not block approval
- **WHEN** the announcement post creation fails (Reddit API error)
- **THEN** the server logs `[APPROVE] announcement post FAILED for ${eventId}: ${err}`
- **AND** the event is still approved (state change + auto-RSVP already happened)
- **AND** the mod receives a success response (the approval itself succeeded; the announcement is a courtesy)

#### Scenario: Non-mod cannot trigger approval
- **WHEN** a non-moderator calls `POST /api/approve-event`
- **THEN** the server returns 403 Forbidden
- **AND** no post is created

### Requirement: Announcement body reuses reminder body builder
The system SHALL reuse the existing `buildReminderBody` helper for the announcement post body, with an empty `attendees` list (no one has RSVPed yet on approval). The body is identical to what a reminder would produce, minus the "going list" section.

#### Scenario: Empty attendees list omits the going list
- **WHEN** the announcement body is built with `attendees=[]`
- **THEN** the body contains all standard sections (date, time, location, map, calendar, description, organizer, RSVP link) but NOT the `## 👥 N going: ...` section
- **AND** the closing "Drop a comment" CTA is included

#### Scenario: Reuse means single body builder
- **WHEN** a future change updates the reminder body format
- **THEN** the announcement body updates automatically (no second body builder to maintain)
- **AND** the announcement and the 24h/2h reminders are visually consistent

### Requirement: Post URL is stored in Redis
The system SHALL write the announcement post URL to Redis at key `meetit:event_post:${eventId}` immediately after the post is created.

#### Scenario: Post URL is stored
- **WHEN** the announcement post is created
- **THEN** the system writes `meetit:event_post:${eventId} = ${post.url}` to Redis
- **AND** the URL is the full Reddit post URL (e.g., `https://www.reddit.com/r/{subreddit}/comments/{postId}/...`)

#### Scenario: Future feature can read the URL
- **WHEN** a future change wants to show "this event was announced here" in My Stuff
- **AND** reads `meetit:event_post:${eventId}` from Redis
- **THEN** the URL is present and usable as a hyperlink
- **AND** the absence of the key (e.g., for events approved before this change) is handled gracefully (no error, just no link)

