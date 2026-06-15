## ADDED Requirements

### Requirement: Events may declare a maximum attendee count
The system SHALL allow event organizers to optionally set a positive integer `maxAttendees` when creating or editing an event. Events without a `maxAttendees` value are treated as unlimited.

#### Scenario: Create an event with a capacity
- **WHEN** the organizer submits a create-event form with `maxAttendees = 20`
- **THEN** the event is stored with `maxAttendees: 20` in the event hash
- **AND** the home card and details overlay display "3/20 going" with a color-coded progress bar

#### Scenario: Create an event without a capacity
- **WHEN** the organizer submits a create-event form with no `maxAttendees`
- **THEN** the event is stored without a `maxAttendees` field
- **AND** no capacity UI is shown on the home card or details overlay

### Requirement: RSVPs are blocked when an event is full
The system SHALL refuse new RSVPs when `rsvpCount >= maxAttendees` and return a clear error to the client.

#### Scenario: RSVP to a full event
- **WHEN** the user submits an RSVP for an event where `rsvpCount >= maxAttendees`
- **THEN** the server returns HTTP 409 with `{ success: false, error: "Event full" }`
- **AND** the client shows a toast "🚫 Event full"

#### Scenario: RSVP to a non-full event with capacity
- **WHEN** the user submits an RSVP for an event where `rsvpCount < maxAttendees`
- **THEN** the RSVP succeeds and the new count is reflected in the UI

### Requirement: Capacity UI color-codes fill level
The system SHALL show the capacity badge in different colors based on the fill percentage: gray below 50%, yellow between 50% and 89%, and red at 90% or above.

#### Scenario: Empty event
- **WHEN** `rsvpCount = 0` and `maxAttendees = 20`
- **THEN** the badge shows "0/20 going" in gray

#### Scenario: Filling up
- **WHEN** `rsvpCount = 12` and `maxAttendees = 20` (60%)
- **THEN** the badge shows "12/20 going" in yellow

#### Scenario: Almost full
- **WHEN** `rsvpCount = 19` and `maxAttendees = 20` (95%)
- **THEN** the badge shows "19/20 going" in red
