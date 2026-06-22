# event-details-card Specification

## Purpose
Event details card layout — category badge positioning, organizer display, and description pagination within the event details overlay.

## Requirements
### Requirement: Category badge is inline with the title

The event details card's category badge SHALL be displayed inline with the event title (top right of the title row), not in a separate row at the bottom of the card.

#### Scenario: Event with category
- **WHEN** the user views the event details card for an event with a category
- **THEN** the category badge is shown in Row 1 (the title row), to the right of the title
- **AND** Row 5 (the previous bottom row that held the category) is no longer rendered

#### Scenario: Event without category
- **WHEN** the user views the event details card for an event without a category
- **THEN** no category badge is rendered (Row 1 has no right-side element)

#### Scenario: Long title
- **WHEN** the event title is longer than 2 lines
- **THEN** the title is truncated to 2 lines (`-webkit-line-clamp: 2`) and the category badge still fits to the right
- **AND** the badge does not push the title off-screen

