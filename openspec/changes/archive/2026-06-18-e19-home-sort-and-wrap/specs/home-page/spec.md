# Spec — Home Page

## Purpose

The home page is the primary event-browsing surface. It displays one event at a time with prev/next navigation. This spec covers the home card's chronological ordering and the prev/next wrap-around behavior.

## ADDED Requirements

### Requirement: Home page displays events in chronological order (soonest first)

The home card SHALL display events in chronological order based on `(date, time)`. The event happening soonest SHALL be the first card shown. This ordering SHALL be guaranteed regardless of server response order.

#### Scenario: User has 2 events at different times on the same day
- **GIVEN** the user has 2 events today: one at 6pm and one at 8pm
- **WHEN** the home page loads
- **THEN** the 6pm event is shown first (idx 0)
- **AND** the 8pm event is shown second (idx 1)

#### Scenario: User has events on different days
- **GIVEN** the user has an event tomorrow at 8pm and an event today at 6pm
- **WHEN** the home page loads
- **THEN** today's 6pm event is shown first (idx 0)
- **AND** tomorrow's 8pm event is shown second (idx 1)

#### Scenario: Two events at the same date and time
- **GIVEN** the user has 2 events both at 6pm today
- **WHEN** the home page loads
- **THEN** both events are shown in their stable order (no flicker / swap between renders)
- **AND** JavaScript's stable `Array.prototype.sort` preserves the original insertion order

### Requirement: Home page prev/next buttons wrap around at boundaries

The home card's "← Prev" and "Next →" buttons SHALL wrap around at the boundaries when there are 2 or more events. Pressing Next on the last event SHALL navigate to the first. Pressing Prev on the first event SHALL navigate to the last. Both buttons SHALL be visible whenever there are 2 or more events.

#### Scenario: User clicks Next on the last event
- **GIVEN** the home card shows the last event (idx = total - 1)
- **AND** total > 1
- **WHEN** the user clicks "Next →"
- **THEN** the home card shows the first event (idx = 0)
- **AND** the dot indicator highlights the first dot
- **AND** the page counter shows "1/total"

#### Scenario: User clicks Prev on the first event
- **GIVEN** the home card shows the first event (idx = 0)
- **AND** total > 1
- **WHEN** the user clicks "← Prev"
- **THEN** the home card shows the last event (idx = total - 1)
- **AND** the dot indicator highlights the last dot
- **AND** the page counter shows "total/total"

#### Scenario: User has only 1 event
- **GIVEN** the user has only 1 event
- **WHEN** the home page loads
- **THEN** the "← Prev" and "Next →" buttons are hidden (no wrap with a single event)

#### Scenario: User has 2 events
- **GIVEN** the user has exactly 2 events
- **WHEN** the user clicks Next on event 2 (idx=1)
- **THEN** the home card shows event 1 (idx=0)
- **WHEN** the user clicks Prev on event 1 (idx=0)
- **THEN** the home card shows event 2 (idx=1)

### Requirement: My Stuff and mod-dashboard prev/next buttons continue to clamp

Other card navigators (My Stuff → Events / Pitches / RSVPs, mod-dashboard → Pending / Published / Pitches) SHALL continue to clamp at boundaries (NOT wrap). This is existing behavior, preserved by the new `wrap=false` default in `updateCardNav`.

#### Scenario: User clicks Next on the last event in My Stuff → Events
- **GIVEN** the My Stuff → Events tab shows the last event (idx = total - 1)
- **WHEN** the user clicks "Next →"
- **THEN** the card stays on the last event (idx = total - 1, clamped)
- **AND** the "Next →" button is hidden (existing behavior)

#### Scenario: User clicks Prev on the first event in My Stuff → Events
- **GIVEN** the My Stuff → Events tab shows the first event (idx = 0)
- **WHEN** the user clicks "← Prev"
- **THEN** the card stays on the first event (idx = 0, clamped)
- **AND** the "← Prev" button is hidden (existing behavior)
