# home-page Specification

## Purpose
Home page features — event carousel navigation, client-side search/filter, share link copy, and category emoji mapping.

## Requirements
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

### Requirement: Home page hides events that have already started

The home page SHALL NOT display events whose start time is in the past. An event is considered "started" when `event.date + "T" + event.time + ":00"` is less than or equal to `Date.now()` in the viewer's local timezone.

#### Scenario: User has a past event from earlier today
- **GIVEN** the user has an event today at 14:00
- **AND** the current time is 18:00 (same day)
- **WHEN** the home page loads
- **THEN** the 14:00 event is NOT shown
- **AND** the next event (sooner than 14:00 from now) is in the first slot

#### Scenario: User has events that just started
- **GIVEN** the user has an event at the current exact time
- **WHEN** the home page loads
- **THEN** the event that just started is NOT shown (it has `eventStart >= now` which is false at the strict-equality moment; this is intentional — the event should be hidden as soon as its start time is reached)

#### Scenario: Event with missing time field (legacy data)
- **GIVEN** the user has a legacy event with no `time` field
- **WHEN** the home page loads
- **THEN** the event IS shown (the filter skips events with missing data, to avoid hiding legacy events)

#### Scenario: All events are in the past
- **GIVEN** the user has only past events
- **WHEN** the home page loads
- **THEN** the home page shows the empty state ("Wow, so empty!" message)

#### Scenario: User is viewing an event that becomes past mid-session
- **GIVEN** the user is viewing an event on the home card
- **WHEN** the event's start time passes
- **AND** the user pulls to refresh or the app auto-refreshes
- **THEN** the home page re-renders without the past event
- **AND** the user is moved to the next available event (or the empty state if no future events remain)

