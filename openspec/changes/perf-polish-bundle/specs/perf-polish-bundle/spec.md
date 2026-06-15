## ADDED Requirements

### Requirement: Home card navigation uses targeted DOM updates
The system SHALL update only the changed elements (title, date, RSVP count, etc.) when navigating between home cards, instead of rebuilding the entire card HTML.

#### Scenario: User taps Next
- **WHEN** the user taps "Next" on the home screen
- **THEN** only the changed text and attributes are updated
- **AND** the card shell, header, and footer are not re-rendered

### Requirement: Reduced background emoji density
The system SHALL reduce the `body::before` emoji count from ~20 to ~5, or replace with a static gradient.

#### Scenario: Initial render
- **WHEN** the page loads
- **THEN** the background has at most 5 visible emojis (or a static gradient)

### Requirement: Font loading uses `font-display: swap`
The system SHALL include `&display=swap` in the Google Fonts URL to prevent Flash of Invisible Text (FOIT).

#### Scenario: Slow network
- **WHEN** the Google Fonts CDN is slow
- **THEN** the fallback system font is shown immediately
- **AND** the custom font is swapped in when loaded
