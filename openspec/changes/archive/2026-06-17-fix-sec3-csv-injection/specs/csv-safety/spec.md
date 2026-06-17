## ADDED Requirements

### Requirement: CSV export escapes special characters and prevents formula injection
The system SHALL escape all CSV fields with double quotes and escape internal double quotes by doubling them. Fields starting with `=`, `+`, `-`, `@`, or a tab character SHALL be prepended with a single quote to prevent formula injection in Excel and similar tools.

#### Scenario: Export a username with a comma
- **WHEN** the attendee's username is "smith, john"
- **THEN** the CSV cell contains `"smith, john"`

#### Scenario: Export a username with a double quote
- **WHEN** the attendee's username is `he"llo`
- **THEN** the CSV cell contains `"he""llo"`

#### Scenario: Export a username starting with a formula character
- **WHEN** the attendee's username is "=SUM(A1:A2)"
- **THEN** the CSV cell contains `"'=SUM(A1:A2)"` (formula injection prevented)
