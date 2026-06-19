## ADDED Requirements

### Requirement: Organizer can view attendee list
The system SHALL show a "👥 N Attendees" button on each published event card in My Stuff where the current user is the event organizer. Tapping the button SHALL open the existing attendee overlay populated with the event's full attendee list.

#### Scenario: Organizer views their own event
- **WHEN** the current user opens My Stuff
- **AND** they own a published event with RSVPs
- **THEN** each owned published event card shows a "👥 N Attendees" button (N = current RSVP count)
- **AND** tapping it opens the attendee overlay with the full list

#### Scenario: Organizer's event has zero RSVPs
- **WHEN** the organizer's event has 0 RSVPs
- **THEN** the button reads "👥 0 Attendees"
- **AND** tapping it still opens the overlay, which shows the "no attendees yet" empty state

#### Scenario: Non-owner views the same card
- **WHEN** a user who is not the organizer views My Stuff
- **THEN** the "👥 Attendees" button is not rendered (the card is not shown to them in the first place, but if it were, the button would be hidden)

### Requirement: Existing attendee endpoint authorizes the organizer
The system's attendee-export endpoint SHALL allow the event's organizer (not just moderators) to read the attendee list for events they own. The endpoint SHALL continue to reject all other users.

#### Scenario: Organizer fetches their own event's attendees
- **WHEN** `context.username` matches `event.organizer`
- **THEN** the endpoint returns the full attendee list (HTTP 200)

#### Scenario: Mod fetches any event's attendees
- **WHEN** `context.username` is a moderator of the subreddit
- **THEN** the endpoint returns the full attendee list (HTTP 200)

#### Scenario: Other user fetches attendees
- **WHEN** `context.username` is neither the organizer nor a moderator
- **THEN** the endpoint returns HTTP 403 with a clear error message

### Requirement: Singular and plural agreement
The button label SHALL use "Attendee" (singular, no s) when the count is exactly 1, and "Attendees" (plural, with s) for 0, 2, or more.

#### Scenario: Exactly one RSVP
- **WHEN** `rsvpCount === 1`
- **THEN** the button label is "👥 1 Attendee"

#### Scenario: Zero or more than one RSVP
- **WHEN** `rsvpCount === 0` or `rsvpCount > 1`
- **THEN** the button label is "👥 N Attendees" where N is the count
