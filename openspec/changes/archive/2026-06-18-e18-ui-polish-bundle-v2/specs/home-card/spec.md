# Spec — Home Card

## Purpose

The home card is the primary surface for browsing upcoming events. It displays one event at a time with prev/next navigation. This spec covers the home card's date display and the new countdown timer for imminent events.

## ADDED Requirements

### Requirement: Home card shows blinking countdown for events in the next 24 hours

When a home card event is more than 0 hours and 24 hours or less away from its start time, the card SHALL display a blinking countdown indicator in the top-right corner of the header, replacing the regular relative-date text.

#### Scenario: Event starting in 5 hours
- **WHEN** the home card renders an event with `date` and `time` 5 hours in the future
- **THEN** the top-right of the header shows `⏰ 5 hrs to go` in red (`#ff4444`) on a light-red background
- **AND** the indicator has the `.countdown-blink` class which applies a 1.2s opacity-pulse animation
- **AND** the regular "Today" / "Tomorrow" / date text is NOT shown

#### Scenario: Event starting in 30 minutes
- **WHEN** the home card renders an event starting 30 minutes from now
- **THEN** the indicator shows `⏰ <1 hr to go`

#### Scenario: Event starting in 18 hours
- **WHEN** the home card renders an event starting 18 hours from now
- **THEN** the indicator shows `⏰ 18 hrs to go` (whole-hour rounding)

#### Scenario: Event starting in 2 days
- **WHEN** the home card renders an event starting 48 hours from now
- **THEN** the countdown indicator is NOT shown
- **AND** the regular "In 2 days" relative-date text displays instead

#### Scenario: Event that has already started or passed
- **WHEN** the home card renders an event with start time in the past
- **THEN** the countdown indicator is NOT shown
- **AND** the regular "Yesterday" / "X days ago" / past date text displays instead

### Requirement: Countdown honors prefers-reduced-motion

The blinking animation SHALL be suppressed when the user has `prefers-reduced-motion: reduce` enabled.

#### Scenario: User with reduce-motion enabled
- **GIVEN** the user's OS or browser has "Reduce motion" enabled
- **WHEN** the home card renders an event within 24 hours
- **THEN** the countdown indicator still displays
- **AND** the indicator does NOT animate (opacity stays at 1)
