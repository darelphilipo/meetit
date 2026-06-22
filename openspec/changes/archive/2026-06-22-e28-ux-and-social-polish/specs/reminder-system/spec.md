# reminder-system Specification (e28 update)

## ADDED Requirements

### Requirement: Reminder post includes list of attendees

The reminder post body SHALL include a "N going" section listing the users who have RSVPed to the event (including the organizer if auto-RSVPed by e28).

#### Scenario: 0 attendees
- **WHEN** no one has RSVPed to the event
- **THEN** the "N going" section is omitted from the post body

#### Scenario: 1-20 attendees
- **WHEN** between 1 and 20 users have RSVPed to the event
- **THEN** the post body includes `## 👥 N going: u/user1 u/user2 ...` with all N usernames

#### Scenario: 20+ attendees
- **WHEN** more than 20 users have RSVPed to the event
- **THEN** the post body includes the first 20 alphabetically-sorted usernames followed by `+N more`

#### Scenario: Performance
- **WHEN** the CRON processes N events for reminders
- **THEN** the server uses `Promise.all` to batch all attendee zRange queries before the loop
- **AND** the total CRON runtime does not increase by more than 100ms per event on a typical 5-event subreddit

#### Scenario: Username normalization
- **WHEN** the RSVP zset contains usernames with or without the `u/` prefix
- **THEN** the rendered post body shows each username with exactly one `u/` prefix
