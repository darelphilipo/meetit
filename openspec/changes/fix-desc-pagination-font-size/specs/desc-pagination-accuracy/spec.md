## ADDED Requirements

### Requirement: splitTextToPages accepts a fontSize parameter
The system SHALL pass a `fontSize` parameter to `splitTextToPages` so the measurement div matches the actual render font size of the description being paginated.

#### Scenario: Default font size
- **WHEN** `splitTextToPages(text, width, height)` is called without a `fontSize` argument
- **THEN** the function uses `fontSize: 15` as the default
- **AND** existing call sites that omit `fontSize` continue to work unchanged

#### Scenario: My Stuff card description
- **WHEN** the My Stuff card description is paginated
- **THEN** `splitTextToPages` is called with `fontSize: 13`
- **AND** the page splits match the actual 13px render

#### Scenario: Mod card description
- **WHEN** the mod card description is paginated
- **THEN** `splitTextToPages` is called with `fontSize: 14`
- **AND** the page splits match the actual 14px render

#### Scenario: User event details description
- **WHEN** the user event details overlay description is paginated
- **THEN** `splitTextToPages` is called with `fontSize: 15` (or default)
- **AND** the page splits match the actual 15px render

### Requirement: Page splits match the actual render
The system SHALL paginate descriptions so each page fits the visible card height with no overflow at the bottom of any page.

#### Scenario: Long description on mod card
- **WHEN** an event with a 500-word description is shown on the mod card
- **THEN** the description is split into N pages such that each page fits the card's max-height
- **AND** no text overflows the page boundary

#### Scenario: Long description on My Stuff card
- **WHEN** a My Stuff card with a 500-word description is paginated
- **THEN** the page splits account for the smaller 13px font size
- **AND** no text overflows the page boundary
