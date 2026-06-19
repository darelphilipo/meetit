# dm-organizer Specification

## Purpose
TBD - created by archiving change e13-direct-message-organizer. Update Purpose after archive.
## Requirements
### Requirement: Direct-message deep link from event details
The system SHALL render a "✉️ Message Organizer" button in the event details overlay (attendee view, step 2) that, when tapped, calls `navigateTo("https://www.reddit.com/message/compose?to={username}")` with the event organizer's username.

#### Scenario: Attendee taps Message Organizer
- **WHEN** an attendee opens the event details overlay for a published event
- **AND** the event has a non-empty `organizer` field
- **THEN** the step-2 organizer block shows a "✉️ Message Organizer" button
- **AND** tapping it opens Reddit's native compose window with `to` pre-filled to the organizer's username

#### Scenario: Event has no organizer
- **WHEN** an event has an empty `organizer` field
- **THEN** the "✉️ Message Organizer" button is omitted from the HTML (no dead button rendered)

### Requirement: Direct-message deep link from mod cards
The system SHALL render a "✉️ Message Organizer" button on each pending event card and a "✉️ Message Pitcher" button on each pitch card in the Mod Dashboard. Both SHALL call `navigateTo("https://www.reddit.com/message/compose?to={username}")` with the relevant submitter's username.

#### Scenario: Mod taps Message Organizer on a pending event
- **WHEN** a moderator taps "✉️ Message Organizer" on a pending event card
- **THEN** Reddit's native compose window opens with `to` pre-filled to the pending event's organizer

#### Scenario: Mod taps Message Pitcher on a pitch
- **WHEN** a moderator taps "✉️ Message Pitcher" on a pitch card
- **THEN** Reddit's native compose window opens with `to` pre-filled to the pitch's `submittedBy` username

#### Scenario: Submitter username is missing
- **WHEN** a pending event or pitch has an empty organizer or `submittedBy` field
- **THEN** the corresponding message button is omitted from the card

### Requirement: Safe URL construction
The system SHALL strip any `u/` prefix from the username and pass the result through `encodeURIComponent()` before inserting it into the `message/compose?to=` URL. The system SHALL log the open event to the debug panel with the target username and the source location (`details`, `mod-pending`, or `mod-pitches`).

#### Scenario: Username has u/ prefix
- **WHEN** the username passed to the handler is `u/alice`
- **THEN** the URL is built from `alice` (prefix stripped) and the debug log shows `target=alice source=...`

#### Scenario: Username contains special characters
- **WHEN** the username contains characters that need URL encoding (e.g. `.`, `_`, spaces)
- **THEN** the URL is correctly encoded so the compose window receives the literal username

