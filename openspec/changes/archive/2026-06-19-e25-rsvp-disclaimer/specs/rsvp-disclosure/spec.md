## ADDED Requirements

### Requirement: RSVP form discloses organizer and moderator access to RSVP details
The RSVP form SHALL display a small, non-blocking disclaimer line that informs the user that their RSVP details (username, email, phone) are visible to the event organizer and subreddit moderators. The disclaimer SHALL appear above the submit button, in the same overlay as the email/phone inputs.

#### Scenario: User opens the RSVP form
- **WHEN** the user opens the RSVP overlay
- **THEN** the form shows a disclaimer line above the "Confirm RSVP" button
- **AND** the disclaimer mentions that the organizer can see the user's RSVP details
- **AND** the disclaimer mentions that subreddit moderators can see the user's RSVP details
- **AND** the disclaimer mentions that public Redditors only see the user's username
- **AND** the disclaimer mentions that the user can leave the event from My Stuff

#### Scenario: Disclaimer is present even when no email/phone is entered
- **WHEN** the user opens the RSVP overlay
- **THEN** the disclaimer is visible regardless of whether the email or phone fields are filled
- **BECAUSE** the disclosure applies to the act of RSVPing itself, not just the contact fields

### Requirement: RSVP disclosure is informational and non-blocking
The RSVP disclosure SHALL be informational only. It SHALL NOT include a checkbox, opt-in toggle, or any other blocking element. Submitting the RSVP with all fields empty SHALL still succeed.

#### Scenario: User submits RSVP without reading disclaimer
- **WHEN** the user clicks "Confirm RSVP →"
- **THEN** the RSVP submits normally (no consent check, no extra step)
- **AND** the user's RSVP is recorded in the event's attendee list

#### Scenario: Disclaimer is not a consent gate
- **WHEN** the user has not interacted with the disclaimer
- **THEN** the submit button is enabled and the RSVP flow proceeds normally
