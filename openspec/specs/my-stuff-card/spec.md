# my-stuff-card Specification

## Purpose
My Stuff card layout for RSVPs, My Events, and Pitches tabs. Defines the compact 3-button action layout for RSVP cards and the attendee count display for organized events.

## Requirements

### Requirement: RSVP card uses compact 3-button layout

The `My Stuff → RSVPs` card SHALL display 3 equal-width compact action buttons in a single row: Edit, Share, Leave.

#### Scenario: 3 buttons in a single row
- **WHEN** the user views a card in `My Stuff → RSVPs`
- **THEN** the action area shows 3 buttons side-by-side: `✏️ Edit`, `🎉 Share`, `❌ Leave`
- **AND** all 3 buttons have equal width (each `flex: 1`)
- **AND** the Share button is pink (primary), Edit and Leave are white (secondary)

#### Scenario: Compact header
- **WHEN** the user views a card in `My Stuff → RSVPs`
- **THEN** the header is a single dense line containing `📅 date`, `⏰ time`, `👥 going count`, and the category badge (if present)
- **AND** the location is on a separate line below the dense row
- **AND** the description body box has more vertical space than before (header shrunk from 4 lines to 2)

#### Scenario: Share button label
- **WHEN** the user views the Share button
- **THEN** the label is `🎉 Share` (not the previous `🎉 Share that I'm going`)

### Requirement: My Events card shows correct attendee count

The `My Stuff → My Events` card SHALL display the correct number of attendees for each event the user has organized.

#### Scenario: Published event with 2 RSVPs
- **WHEN** the user views a published event they organized in `My Stuff → My Events`
- **AND** 2 users have RSVPed to that event
- **THEN** the "👥 N Attendees" button displays `👥 2 Attendees` (not `👥 0 Attendees`)

#### Scenario: Pending event
- **WHEN** the user views a pending event in `My Stuff → My Events`
- **THEN** the attendee count is 0 (pending events can't have RSVPs since they're not yet published)
