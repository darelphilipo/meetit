## ADDED Requirements

### Requirement: Home cards show a mini avatar row of attendees
The system SHALL display up to 3 attendee avatar circles on each home card, followed by a "+N" indicator when more than 3 attendees exist.

#### Scenario: Card with no attendees
- **WHEN** an event has 0 RSVPs
- **THEN** the home card does not display the attendee preview row

#### Scenario: Card with up to 3 attendees
- **WHEN** an event has 1, 2, or 3 RSVPs
- **THEN** the home card shows that many avatar circles, one per attendee

#### Scenario: Card with more than 3 attendees
- **WHEN** an event has 5 RSVPs
- **THEN** the home card shows 3 avatar circles followed by "+2"

### Requirement: Avatar circles show the user's initial in a colored circle
The system SHALL render each avatar as a 24px circle with the first letter of the username in white, on a stable per-user colored background.

#### Scenario: Render an avatar
- **WHEN** the username is "alice"
- **THEN** the avatar shows "A" in white on a colored circle
- **AND** the color is stable for that username across all renders

#### Scenario: Username with prefix
- **WHEN** the username is "u/alice"
- **THEN** the avatar shows "A" (the prefix is stripped)

### Requirement: Server provides attendee preview in the home response
The `/api/home` response SHALL include `attendeePreview: string[]` (up to 3 usernames) for each event, fetched via a single batched query.

#### Scenario: Response with 5 attendees
- **WHEN** the event has 5 attendees
- **THEN** the response includes `attendeePreview: ["alice", "bob", "carol"]` and `rsvpCount: 5`

#### Scenario: Response with 0 attendees
- **WHEN** the event has 0 attendees
- **THEN** the response includes `attendeePreview: []` and `rsvpCount: 0`
