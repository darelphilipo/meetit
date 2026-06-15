## ADDED Requirements

### Requirement: Re-RSVP pre-fills contact info and confirms update
The system SHALL pre-populate the email and phone fields in the RSVP form with the user's existing values when re-opening the form for a re-RSVP, and show a confirmation toast on successful update.

#### Scenario: Re-RSVP pre-fill
- **WHEN** the user opens the RSVP form for an event they are already RSVP'd to
- **THEN** the email and phone fields are pre-filled with their stored values
- **AND** a "✏️ You're updating your RSVP" banner is shown

#### Scenario: Re-RSVP success
- **WHEN** the user updates their contact info and submits
- **THEN** the toast "✏️ RSVP updated — new contact info saved" is shown
- **AND** the server returns `wasExisting: true`
