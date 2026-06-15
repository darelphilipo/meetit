## ADDED Requirements

### Requirement: Home screen provides a search input and category filter
The system SHALL provide a search input and a horizontal category pill row on the home screen. The UI is hidden by default on mobile and revealed via a "🔍" toggle button in the header.

#### Scenario: User opens the search
- **WHEN** the user taps the "🔍" toggle
- **THEN** the search bar and category pills are revealed below the header

#### Scenario: User searches
- **WHEN** the user types "chai" in the search bar
- **THEN** the home card displays only events whose title contains "chai" (case-insensitive)

#### Scenario: User filters by category
- **WHEN** the user taps the "Tech" category pill
- **THEN** the home card displays only events in the "Tech" category
- **AND** the active pill is highlighted

#### Scenario: No matches
- **WHEN** the search and category filter produce zero results
- **THEN** the home screen shows an empty state: "No events match your search"
