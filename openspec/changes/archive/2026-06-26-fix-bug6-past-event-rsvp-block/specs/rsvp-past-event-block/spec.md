## ADDED Requirements

### Requirement: RSVP server explicitly blocks past events
The system SHALL refuse any RSVP for an event whose date is in the past, even if a stale `getActiveEvents` cache still includes the event.

#### Scenario: RSVP to a past event
- **WHEN** the user submits an RSVP for an event with `event.date < today`
- **THEN** the server returns HTTP 400 with `{ success: false, error: "Cannot RSVP to past events" }`
- **AND** logs `[FEATURE] rsvp-past-event-blocked`
