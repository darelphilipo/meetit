## ADDED Requirements

### Requirement: Relative time formatter
The system SHALL provide a `formatRelativeTime(ms: number): string` utility in `src/shared/meetit.ts` that returns a human-readable label based on the age in milliseconds.

#### Scenario: Less than a minute
- **WHEN** the age is less than 60 seconds
- **THEN** the label is "just now"

#### Scenario: Minutes
- **WHEN** the age is between 1 minute and 60 minutes
- **THEN** the label is "Nm ago" where N is the whole number of minutes (e.g., "5m ago")

#### Scenario: Hours
- **WHEN** the age is between 1 hour and 24 hours
- **THEN** the label is "Nh ago" where N is the whole number of hours

#### Scenario: Days
- **WHEN** the age is between 1 day and 7 days
- **THEN** the label is "Nd ago" where N is the whole number of days

#### Scenario: Weeks
- **WHEN** the age is between 1 week and 30 days
- **THEN** the label is "Nw ago" where N is the whole number of weeks

#### Scenario: More than 30 days
- **WHEN** the age is 30 days or more
- **THEN** the label is an absolute date "MMM D" (e.g., "Jan 15")

#### Scenario: Negative age (clock skew)
- **WHEN** the age is negative
- **THEN** the label is "just now" (no negative output)

#### Scenario: Invalid input
- **WHEN** the input is `NaN` or `Infinity`
- **THEN** the label is "—"

### Requirement: My Stuff status timeline
The system SHALL render a status-timeline line under each event and pitch card in My Stuff, showing the relative time the item entered its current status.

#### Scenario: Pending event
- **WHEN** a user views a pending event in My Events
- **THEN** the card shows "📅 Submitted {label} · Usually reviewed within 48hrs"

#### Scenario: Published event
- **WHEN** a user views a published event in My Events
- **THEN** the card shows "📈 {rsvpCount} RSVPs · approved {label}"

#### Scenario: Rejected event
- **WHEN** a user views a rejected event in My Events
- **THEN** the card shows "❌ Rejected {label}"

#### Scenario: Pending pitch
- **WHEN** a user views a pending pitch in My Pitches
- **THEN** the card shows "📅 Submitted {label} · Usually reviewed within 48hrs"

#### Scenario: Approved pitch
- **WHEN** a user views an approved pitch in My Pitches
- **THEN** the card shows "📈 Promoted to {count} event(s) · approved {label}"

#### Scenario: Rejected pitch
- **WHEN** a user views a rejected pitch in My Pitches
- **THEN** the card shows "❌ Rejected {label}"

### Requirement: Graceful degradation
The system SHALL tolerate a missing or invalid `submittedAt` field by falling back to `createdAt`, and SHALL NOT crash the render if both are absent.

#### Scenario: Both timestamps missing
- **WHEN** `submittedAt` and `createdAt` are both absent or invalid
- **THEN** the status-timeline line shows "—" for the time label and the rest of the card renders normally
