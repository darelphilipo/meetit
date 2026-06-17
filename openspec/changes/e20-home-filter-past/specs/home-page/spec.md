# Spec — Home Page

## Purpose

The home page is the primary event-browsing surface. It displays one event at a time with prev/next navigation. This spec covers what events appear on the home page and in what order.

## ADDED Requirements

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
