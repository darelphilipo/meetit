## ADDED Requirements

### Requirement: Organizers and moderators can edit events in place
The system SHALL allow an event's organizer (or any moderator) to update the event's fields via a new `/api/edit-event` endpoint without recreating the event or losing RSVP data.

#### Scenario: Organizer edits their own event
- **WHEN** the event organizer submits an edit form for one of their events
- **THEN** the server updates the event hash in place
- **AND** the event's `id`, RSVP set, and CRON state are preserved
- **AND** the event is re-submitted for mod review if it was previously published

#### Scenario: Moderator edits a published event
- **WHEN** a moderator edits a published event
- **THEN** the server updates the event hash in place
- **AND** the event moves back to "pending" for re-review

#### Scenario: Non-owner non-mod attempts to edit
- **WHEN** a user who is neither the organizer nor a moderator tries to edit an event
- **THEN** the server returns HTTP 403 with `{ success: false, error: "Not authorized" }`

### Requirement: Edit form pre-fills with current event data
The system SHALL pre-populate the 4-step create event form with the current values of the event being edited.

#### Scenario: Open edit form
- **WHEN** the user clicks "✏️ Edit" on a My Stuff event card
- **THEN** the form opens with all fields (title, date, time, location, description, etc.) pre-filled
- **AND** an "✏️ Editing event" banner is displayed at the top
- **AND** the submit button reads "Save Changes"
