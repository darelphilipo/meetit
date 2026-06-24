## MODIFIED Requirements

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
