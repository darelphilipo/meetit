# submit-event-wizard Specification

## Purpose
Event submission wizard — 4-card form flow (title/cat/org, date/time/location, description, review) with auto-RSVP organizer on approval and paginated description review.

## Requirements
### Requirement: Submit wizard is 4 cards (title/cat/org, date/time/location/maps, description, review)

The wizard SHALL be exactly 4 cards in this order:

1. Card 1 — Title, Category, Organizer
2. Card 2 — Date, Time, Location, Google Maps Link
3. Card 3 — Description (full-width textarea, fills the card vertically)
4. Card 4 — Review your event (read-only preview of all collected data)

The wizard SHALL show 4 progress dots (`event-dot-1` through `event-dot-4`) in the footer.

#### Scenario: User opens the submit form
- **WHEN** the user taps the "+" button to create a new event
- **THEN** the wizard opens at card 1
- **AND** only `event-dot-1` is marked active
- **AND** the previous button is hidden (or disabled)
- **AND** the next button is visible and labelled "Next →"

#### Scenario: User advances from card 2 to card 3
- **WHEN** the user taps "Next →" on card 2
- **THEN** the wizard validates that Date, Time, AND Location are all non-empty
- **AND** if any of these is empty, the wizard shows a toast naming the missing field and does NOT advance
- **AND** if all are valid, the wizard advances to card 3 and marks `event-dot-2` as done and `event-dot-3` as active

#### Scenario: User advances from card 3 to card 4
- **WHEN** the user taps "Next →" on card 3 (description)
- **THEN** the wizard validates that the description is non-empty
- **AND** if empty, shows a toast and does NOT advance
- **AND** if non-empty, populates the review card's title/meta/description previews and advances to card 4
- **AND** marks `event-dot-3` as done and `event-dot-4` as active

### Requirement: Description textarea fills card 3 vertically

The description card (`event-step-3` after the e18 refactor) SHALL display a textarea that fills the available vertical space between the label and the wizard footer.

#### Scenario: User views the description card
- **WHEN** the wizard displays card 3 on a 600px tall viewport
- **THEN** the description textarea occupies at least 280px of vertical space
- **AND** the textarea grows to fill any remaining card height
- **AND** the textarea is not user-resizable (browser-native resize handle is hidden)

### Requirement: Review card 4 shows paginated description with explicit buttons

Card 4 (review) SHALL display the event's full description split into pages with explicit `← Previous` and `Next →` buttons when the description exceeds 100 characters.

#### Scenario: Review card with short description
- **WHEN** the user advances to card 4 and the description is 80 characters or less
- **THEN** the full description displays in a single vertical scrollable box
- **AND** no Previous/Next buttons are shown

#### Scenario: Review card with long description
- **WHEN** the user advances to card 4 and the description is more than 100 characters
- **THEN** the description is split into pages sized to fit the card body
- **AND** the first page displays with a `Next →` button on the right
- **AND** the page indicator shows "1/N" where N is the total page count
- **AND** tapping `Next →` slides to the next page and shows `← Previous` (and `Next →` if more pages remain)
- **AND** tapping `← Previous` slides back

#### Scenario: User edits description and re-reviews
- **WHEN** the user taps "← Previous" on card 4 to return to card 3, edits the description, and advances to card 4 again
- **THEN** the pager refreshes with the new content (page count and current page reset to 1)

### Requirement: Organizer is auto-RSVPed when event is approved
When a moderator approves a pending event, the system SHALL automatically RSVP the event's organizer to their own event. The organizer SHALL appear in both "My Events" (as the organizer) and "My RSVPs" (as an attendee). The auto-RSVP SHALL be idempotent — re-approving an already-RSVPed organizer is a no-op.

#### Scenario: Event approved, organizer not yet RSVPed
- **WHEN** a moderator approves a pending event with organizer `u/darelphilip`
- **THEN** the system calls `redis.zAdd("meetit:rsvps:${eventId}", { member: "darelphilip", score: <timestamp> })`
- **AND** the organizer appears in the event's attendee list
- **AND** the event appears in the organizer's My Stuff → RSVPs tab

#### Scenario: Event re-approved, organizer already RSVPed
- **WHEN** a moderator approves an event that was already approved (re-approval)
- **THEN** the `zAdd` is idempotent (same member key) and does not create a duplicate entry
- **AND** the organizer's RSVP status is unchanged

