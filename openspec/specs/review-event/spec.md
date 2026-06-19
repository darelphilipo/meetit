# review-event Specification

## Purpose
TBD - created by archiving change e18-ui-polish-bundle-v2. Update Purpose after archive.
## Requirements
### Requirement: Review card description uses explicit Previous/Next pager for long text

The review card (card 4 of the submit wizard) SHALL display the event's full description with explicit `← Previous` and `Next →` pagination buttons when the description exceeds 100 characters. CSS-only overflow tricks (overflow-x:auto, white-space:nowrap) are explicitly NOT acceptable — buttons are required.

#### Scenario: Review with short description
- **WHEN** the user advances to the review card with a description of 100 characters or less
- **THEN** the full description displays in a single vertical scrollable box
- **AND** no Previous/Next buttons are shown

#### Scenario: Review with long description
- **WHEN** the user advances to the review card with a description longer than 100 characters
- **THEN** the description is split into pages sized to fit the review card body
- **AND** the first page displays with a `Next →` button
- **AND** a page indicator shows "1/N"
- **AND** tapping `Next →` slides to page 2 and shows `← Previous`

#### Scenario: Re-reviews after editing
- **WHEN** the user navigates back to card 3 (description), edits the text, and advances to card 4 again
- **THEN** the pager refreshes with the new content
- **AND** the current page resets to 1
- **AND** the total page count is recomputed

### Requirement: Review card title and meta use the same pager pattern when overflowing

When the event title or the meta line (date/time/location) is too long to fit on one line in the review card, the card SHALL show explicit left/right scroll buttons OR shorten the text with an ellipsis. (Implementation: the current `overflow-x:auto; white-space:nowrap;` CSS approach is preserved as a fallback for the title and meta, but the description MUST use explicit buttons.)

#### Scenario: Review with short title
- **WHEN** the event title fits on one line in the review card
- **THEN** no title pager is needed

#### Scenario: Review with very long title
- **WHEN** the event title is longer than the review card width
- **THEN** the title is displayed with CSS `overflow-x:auto; white-space:nowrap;` (existing behavior — no buttons required for title/meta, only description)

