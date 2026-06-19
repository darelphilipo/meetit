# home-card Specification

## Purpose

The home card is Meetit's primary discovery surface. e20 transforms it from a flat list-row into a visually dominant hero card with category-driven visual identity, a clear primary CTA hierarchy, and a sense of urgency for events that are happening soon.

## ADDED Requirements

### Requirement: Home card displays a category accent stripe

The home event card SHALL display a 6px solid colored stripe down the left edge, using the event's category color from the CAT_MAP table. The stripe runs the full height of the card.

#### Scenario: Tech event renders with purple stripe
- **GIVEN** a home event with `category: "tech"`
- **WHEN** the home card renders
- **THEN** the card-shell has `border-left: 6px solid #6366f1` (Tech purple)
- **AND** the stripe is visible on the left edge of the entire card

#### Scenario: Food event renders with orange stripe
- **GIVEN** a home event with `category: "food"`
- **WHEN** the home card renders
- **THEN** the card-shell has `border-left: 6px solid #f97316` (Food orange)

#### Scenario: Event with no category renders without stripe
- **GIVEN** a home event with `category: null` or `category: undefined`
- **WHEN** the home card renders
- **THEN** the card-shell has no accent stripe (default border only)

### Requirement: Home card title is 22px

The home card title (`<h3>` element) SHALL render at 22px font-size, 700 weight, 1.25 line-height. The title is clamped to 2 lines.

#### Scenario: Title at 22px
- **GIVEN** a home event with title "Monthly Dev Meetup — Building Indie SaaS"
- **WHEN** the home card renders
- **THEN** the h3 element has class `card-title-hero`
- **AND** its computed `font-size` is 22px
- **AND** the title is clamped to 2 lines via `-webkit-line-clamp: 2`

#### Scenario: Mod card title is NOT 22px
- **GIVEN** a mod dashboard card
- **WHEN** the mod card renders
- **THEN** the title uses `card-title-lg` (18px) — NOT the new `card-title-hero` class

### Requirement: Home card emoji tile is 56px

The home card emoji icon tile SHALL be 56×56px, with the emoji font-size 32px (fallback `📅` at 22px). The tile has a 4px black border, primary yellow background, and 4px 4px 0 shadow.

#### Scenario: Event with emoji renders 56px tile
- **GIVEN** a home event with `emoji: "💻"`
- **WHEN** the home card renders
- **THEN** the emoji tile is 56×56px
- **AND** the emoji is rendered at 32px

#### Scenario: Event without emoji renders fallback tile
- **GIVEN** a home event with no `emoji` field
- **WHEN** the home card renders
- **THEN** the fallback tile is 56×56px with a `📅` icon at 22px on a surface-colored background

### Requirement: Home card primary CTA is visually dominant

The home card's action row SHALL have a clear primary CTA hierarchy: the RSVP button takes 2× the width of the Details button. Both buttons are 44px tall (from e21).

#### Scenario: RSVP button is twice the width of Details
- **GIVEN** a home event with no existing RSVP
- **WHEN** the home card renders
- **THEN** the action row has 3 buttons: Details (flex:1), RSVP (flex:2), Share (icon)
- **AND** the RSVP button is visually wider than the Details button
- **AND** the RSVP button is filled pink (`btn-pink`) — the only filled button in the row

#### Scenario: Already-RSVP'd user sees green dominant button
- **GIVEN** a home event where the user has already RSVP'd (`hasRsvped: true`)
- **WHEN** the home card renders
- **THEN** the action row's middle button is "✅ Going" (green, flex:2) instead of "🎟️ RSVP" (pink, flex:2)

#### Scenario: Narrow viewport wraps to two rows
- **GIVEN** the viewport is ≤360px wide
- **WHEN** the home card renders
- **THEN** the action row wraps gracefully to two rows (Details + Share on one row, RSVP on the second) without overflowing

### Requirement: Home card shows "LIVE NOW" for events in the next 30 minutes

The home card SHALL show a pulsing red "🔴 LIVE NOW" badge in the top-right of the header for events whose start time is 30 minutes or less in the future (and not yet started). This replaces the regular date text and the regular countdown badge.

#### Scenario: Event starting in 15 minutes
- **GIVEN** a home event with start time 15 minutes in the future
- **WHEN** the home card renders
- **THEN** the top-right of the header shows "🔴 LIVE NOW" in red (`var(--danger)`) on a light-red background (`var(--danger-bg)`)
- **AND** the badge has the `countdown-blink` class which applies a 1.2s opacity-pulse animation
- **AND** the regular relative-date text is NOT shown
- **AND** the regular "⏰ <1 hr to go" countdown is NOT shown (LIVE NOW supersedes it)

#### Scenario: Event starting in 45 minutes
- **GIVEN** a home event with start time 45 minutes in the future
- **WHEN** the home card renders
- **THEN** the LIVE NOW badge is NOT shown
- **AND** the regular "⏰ <1 hr to go" countdown is shown

#### Scenario: Event that has already started
- **GIVEN** a home event with start time in the past
- **WHEN** the home card renders
- **THEN** the LIVE NOW badge is NOT shown
- **AND** the regular date text is shown

### Requirement: Home card slide animation on prev/next

When the user clicks "← Prev" or "Next →" on the home card, the new card SHALL slide in horizontally with a 200ms animation. The initial render SHALL NOT play the slide animation.

#### Scenario: User clicks Next
- **GIVEN** the home card is on event 1 of 3
- **WHEN** the user clicks "Next →"
- **THEN** the new card (event 2) animates in with `cardSwapInFromRight` (translateX(20px) → 0)
- **AND** the animation takes 200ms with `ease-out` timing
- **AND** the animation does NOT play on the very first render of the card

#### Scenario: User clicks Prev
- **GIVEN** the home card is on event 2 of 3
- **WHEN** the user clicks "← Prev"
- **THEN** the new card (event 1) animates in with `cardSwapInFromLeft` (translateX(-20px) → 0)
- **AND** the animation takes 200ms with `ease-out` timing

#### Scenario: User has only 1 event
- **GIVEN** the home has only 1 event
- **WHEN** the page loads
- **THEN** no card-swap animation plays (the prev/next buttons are hidden)
- **AND** no card-swap class is added to the card-shell

### Requirement: Card-swap animation respects reduced motion

The card-swap slide animation SHALL be suppressed when the user has `prefers-reduced-motion: reduce` enabled. The card still re-renders, just without the slide.

#### Scenario: User with reduce-motion enabled
- **GIVEN** the user has `prefers-reduced-motion: reduce` enabled
- **WHEN** the user clicks Next
- **THEN** the new card appears instantly (no translateX animation)
- **AND** the global `prefers-reduced-motion` rule overrides the `cardSwapInFromLeft` / `cardSwapInFromRight` keyframes
