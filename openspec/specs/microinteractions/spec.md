# microinteractions Specification

## Purpose
TBD - created by archiving change e23-microinteractions. Update Purpose after archive.
## Requirements
### Requirement: Press-and-squish feedback on all buttons

All button variants (`.btn`, `.close-btn`, `.footer-btn`, `.icon-btn`) SHALL scale to 0.97 on `:active` for 80ms, layered on top of the existing translate(3-4px) press. The squish makes the button feel tactile.

#### Scenario: User presses a primary button
- **GIVEN** the user is on the home card
- **WHEN** the user presses (mousedown / touchstart) the "🎟️ RSVP" button
- **THEN** the button scales to 0.97 over 80ms
- **AND** the existing `translate(4px, 4px)` press is preserved
- **AND** the box-shadow collapses to 0 as before

#### Scenario: User presses a pager button
- **GIVEN** the user is in a multi-page description
- **WHEN** the user presses the "Next →" pager button
- **THEN** the button does NOT scale to 0.97 (pagers stay unsquished — they're tiny and squishing would feel weird)
- **AND** the existing `box-shadow: none` and `translate(3px, 3px)` still apply

### Requirement: Card enter stagger on event tags

The home card's meta-row chips (time, count, category) SHALL fade in with a 40ms cascade. Each chip's stagger delay is controlled by a `--i` CSS custom property.

#### Scenario: Home card renders with 3 chips
- **GIVEN** the home card has 3 event tags (time, count, category)
- **WHEN** the card renders
- **THEN** the time chip fades in with `--i: 0` (0ms delay)
- **AND** the count chip fades in with `--i: 1` (40ms delay)
- **AND** the category chip fades in with `--i: 2` (80ms delay)
- **AND** the total stagger duration is 80ms + 200ms animation = 280ms

#### Scenario: User with reduce-motion enabled
- **GIVEN** the user has `prefers-reduced-motion: reduce` enabled
- **WHEN** the chips render
- **THEN** the chips appear instantly (the `fadeInUp` animation is suppressed by the global reduced-motion rule)
- **AND** the `animation-delay` is also suppressed

### Requirement: Success checkmark draw on RSVP confirmation

When a user successfully RSVPs to an event, the confirmation overlay SHALL show an animated checkmark that draws itself: a circle stroke first (0.4s), then a check path (0.3s, starting at 0.4s).

#### Scenario: User submits a new RSVP
- **GIVEN** the user is on the RSVP overlay
- **WHEN** the user submits their contact info and the API returns success
- **THEN** the details overlay (step 4 "You're on the list!") shows an SVG checkmark instead of the static 🎉 emoji
- **AND** the checkmark circle draws over 0.4s
- **AND** the check path draws over the next 0.3s (starting after the circle completes)
- **AND** the total animation is 0.7s

#### Scenario: User updates existing RSVP contact info
- **GIVEN** the user is updating their RSVP contact info
- **WHEN** the API returns success
- **THEN** the "Contact info updated" overlay still shows the static ✅ emoji (less celebratory path — no checkmark draw)

### Requirement: RSVP first-time bounce

When the user has just submitted an RSVP in the current session, the home card's RSVP button SHALL do a 400ms scale bounce (1 → 1.08 → 1) the next time the home card is rendered.

#### Scenario: User submits RSVP and returns to home
- **GIVEN** the user has just submitted an RSVP for event "X"
- **WHEN** the home card renders and the RSVP button is now "✅ Going" (green)
- **THEN** the green "✅ Going" button does a 400ms scale bounce
- **AND** the bounce fires only once (the `justRsvpedIds` flag is cleared after the bounce completes)

#### Scenario: User reloads the home page after RSVPing
- **GIVEN** the user RSVP'd yesterday and reloads the home page
- **WHEN** the home card renders
- **THEN** the green "✅ Going" button does NOT bounce (the `justRsvpedIds` flag is empty on a fresh session)
- **AND** the bounce only fires for RSVP submissions in the current browser session

### Requirement: Toast slide-in animation

All toasts (success toasts from `showToast()` and copy toasts from `showCopyToast()`) SHALL slide in from below the viewport with a 0.25s animation that includes a small overshoot.

#### Scenario: User copies a share link
- **GIVEN** the user clicks the "📤" share button
- **WHEN** the clipboard copy succeeds
- **THEN** a "📍 Copied!" toast appears
- **AND** the toast slides in from 100px below its resting position
- **AND** the toast overshoots by 10px at 60% of the animation
- **AND** the toast settles at its resting position by 100% of the animation
- **AND** the total animation is 0.25s

#### Scenario: User submits a successful action
- **GIVEN** the user has performed any successful action (RSVP, delete, etc.)
- **WHEN** a success toast is shown
- **THEN** the toast slides in with the same animation as the copy toast
- **AND** the toast is dismissed after `TOAST_DURATION` ms (3000ms)

### Requirement: Countdown badge uses transform pulse

The `blinkPulse` keyframe SHALL animate `transform: scale(1) → 1.05 → 1` instead of `opacity: 1 → 0.55 → 1`. The badge stays fully readable at all times. The badge element must have `display: inline-block` for the transform to apply.

#### Scenario: Countdown badge pulses
- **GIVEN** the home card shows a countdown badge for an event in the next 24 hours
- **WHEN** the badge renders
- **THEN** the badge scales from 1.0 to 1.05 over 0.6s
- **AND** the badge scales back to 1.0 over the next 0.6s
- **AND** the badge text stays fully opaque throughout (no fade)

#### Scenario: LIVE NOW badge pulses
- **GIVEN** the home card shows a "🔴 LIVE NOW" badge
- **WHEN** the badge renders
- **THEN** the badge pulses with the same scale animation
- **AND** the badge has `display: inline-block` so the transform applies

#### Scenario: User with reduce-motion enabled
- **GIVEN** the user has `prefers-reduced-motion: reduce` enabled
- **WHEN** the countdown badge renders
- **THEN** the badge does NOT pulse (the global reduced-motion rule kills the animation)
- **AND** the badge text remains fully visible at scale 1.0

