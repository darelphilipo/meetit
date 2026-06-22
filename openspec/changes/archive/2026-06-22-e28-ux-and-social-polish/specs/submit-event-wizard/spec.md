# submit-event-wizard Specification (e28 update)

## ADDED Requirements

### Requirement: Organizer is auto-RSVPed on approval

When a mod approves a pending event, the event organizer SHALL be automatically added to the event's RSVP list (`meetit:rsvps:{eventId}`). This makes the event appear in the organizer's `My Stuff → RSVPs` tab and counts as 1 in the attendee list.

#### Scenario: Mod approves an event
- **WHEN** a moderator calls `onApproveEvent({ eventId })` for a pending event
- **THEN** the server adds the event organizer's normalized username to `meetit:rsvps:{eventId}` with the current timestamp as the score
- **AND** the organizer's `My Stuff → RSVPs` list shows the new event
- **AND** the event's `rsvpCount` is at least 1 (just the organizer) until others RSVP

#### Scenario: Mod approves an event where the organizer is also the mod
- **WHEN** the mod approving the event is the same person as the event's organizer
- **THEN** the same auto-RSVP logic runs (idempotent — the user is RSVPed once)

#### Scenario: Auto-RSVP is idempotent
- **WHEN** the organizer is already in the RSVP list and a mod re-approves the event (e.g., unapprove then re-approve)
- **THEN** the second `zAdd` is a no-op (Redis overwrites the score for the same member)

#### Scenario: Defensive: empty organizer
- **WHEN** the event's `organizer` field is empty or missing
- **THEN** the server skips the auto-RSVP step (no `zAdd` call) but still approves the event successfully
