# mod-dashboard Specification

## Purpose
Mod dashboard — pending/published/pitches tabs, approve/decline workflow, attendee view with contact details, and mod detail overlay.

## Requirements
### Requirement: Mod dashboard always opens on the Pending tab

When the mod dashboard is opened (via the 🛡️ icon or any entry point), the Pending tab SHALL be the active tab, regardless of the last tab the mod viewed in a previous session.

#### Scenario: Mod reopens dashboard after viewing Published
- **GIVEN** the mod opened the dashboard, switched to the "Published" tab, and closed the dashboard
- **WHEN** the mod reopens the dashboard
- **THEN** the "Pending" tab has the active class (yellow background, pink underline per `app.html:41`)
- **AND** the pending events content is rendered (not published events)
- **AND** the internal `modTab` variable is `"pending"`

#### Scenario: Mod reopens dashboard after viewing Pitches
- **GIVEN** the mod opened the dashboard, switched to the "Pitches" tab, and closed the dashboard
- **WHEN** the mod reopens the dashboard
- **THEN** the "Pending" tab is active and content matches

### Requirement: Pending card shows 3 buttons: Details, Approve, Decline

Each pending event card SHALL display three buttons in a single row, in this order: Details, Approve, Decline.

#### Scenario: Pending card buttons layout
- **WHEN** a pending event is rendered in the dashboard
- **THEN** the actions row contains exactly 3 buttons in this order: `👁️ Details`, `✅ Approve`, `🗑️ Decline`
- **AND** the row uses `display:flex; gap:8px; flex-wrap:wrap;` so the buttons can wrap to a second row on narrow viewports

#### Scenario: Mod taps Details on a pending event
- **WHEN** the mod taps "Details" on a pending event
- **THEN** the 4-card mod detail overlay opens, showing the same content that would be shown for a published event
- **AND** the event is found by searching `modItems["pending"]` first, then `modItems["published"]`

### Requirement: Pending card shows Days Overdue badge

Each pending event card SHALL display a `⏰ N day(s) pending` badge when the event was submitted more than 24 hours ago.

#### Scenario: Pending event submitted yesterday
- **WHEN** a pending event has `submittedAt` between 24 and 48 hours ago
- **THEN** the card shows `⏰ 1 day pending` in amber (`#ffaa00`)

#### Scenario: Pending event submitted 3 days ago
- **WHEN** a pending event has `submittedAt` 72 hours ago
- **THEN** the card shows `⏰ 3 days pending` in red (`#ff4444`)

#### Scenario: Freshly submitted pending event
- **WHEN** a pending event has `submittedAt` less than 24 hours ago
- **THEN** no Days Overdue badge is shown

### Requirement: Published card badges sit on a single flex row

On the published tab, the category badge, RSVP-count badge, and (if applicable) Past Event badge SHALL all sit on a single horizontal row, separated by 6px gaps, with wrap-on-overflow for narrow viewports.

#### Scenario: Published event with all three badges
- **WHEN** a published event has category "Tech", 5 going, and a past date
- **THEN** the card shows `Tech` `🟢 5 going` `⏰ Past Event` on one line with 6px gaps
- **AND** the badges wrap to multiple lines if they don't fit on a 360px viewport

### Requirement: Pitches card shows paginated description for long pitches

On the pitches tab, when a pitch's description is more than 100 characters, the card body SHALL show a paginated view with explicit `← Previous` and `Next →` buttons.

#### Scenario: Pitch with short description
- **WHEN** a pitch has a description of 100 characters or less
- **THEN** the card shows the full description in a single vertical scrollable box (no pager)

#### Scenario: Pitch with long description
- **WHEN** a pitch has a description of more than 100 characters
- **THEN** the card body is paginated with `← Previous` / `Next →` buttons matching the description pager pattern
- **AND** the page indicator shows "1/N"

### Requirement: Existing Who's Going pager behavior is preserved

The mod-event-detail overlay's "Who's Going" card (card 3 of the 4-card detail) SHALL continue to paginate attendees 5 per page with explicit `← Previous` and `Next →` buttons. This is existing behavior; the e18 change does not modify it.

#### Scenario: Mod views attendees for an event with 8 RSVPs
- **WHEN** the mod opens the detail overlay and navigates to card 3 (Who's Going)
- **THEN** the first 5 attendees display
- **AND** a `Next →` button and "1/2" page indicator are shown
- **AND** tapping `Next →` shows attendees 6-8 with a `← Previous` button

