# design-system Specification

## Purpose

Meetit's visual design system is implemented as a single CSS file (`public/app.html`) using custom properties on `:root`. The system provides:

1. **Semantic color tokens** — every surface, text color, and state has a named token (e.g., `--danger`, `--success`, `--on-primary`)
2. **Automatic light/dark mode** — all color tokens wrap values in `light-dark(lightVal, darkVal)` so the app respects the user's OS `prefers-color-scheme` setting with zero JS
3. **Touch-target safe** — every interactive element is at least 44px tall to meet Apple HIG
4. **Safe-area aware** — body and overlay chrome use `env(safe-area-inset-*)` for iOS notch and home indicator
5. **Typography scale** — semantic card-title classes prevent the h3-size drift that accumulated across render functions

## ADDED Requirements

### Requirement: Status colors are tokenized

The design system SHALL expose semantic status color tokens that are used consistently across all components. Hex values SHALL NOT appear inline in components — they SHALL reference the token.

#### Scenario: Countdown badge uses danger token
- **GIVEN** the home card renders a countdown badge for an event in the next 24 hours
- **WHEN** the badge HTML is inspected
- **THEN** its `color` and `background` reference `var(--danger)` and `var(--danger-bg)` respectively
- **AND** the inline style contains no hex value like `#ff4444` or `#fff3f3`

#### Scenario: Mod dashboard badges use semantic tokens
- **GIVEN** the mod dashboard renders pending, urgent, and resolved badges
- **WHEN** the badge HTML is inspected
- **THEN** urgent states use `var(--warn)`, error states use `var(--danger)`, success states use `var(--success)`
- **AND** the inline style contains no hex value like `#ffaa00`, `#ff4444`, or `#00ff88`

### Requirement: Dark mode is automatic

When the user's OS or browser has `prefers-color-scheme: dark` enabled, the app SHALL render in dark mode without any JS interaction. The yellow primary color (`#ffff00`) SHALL stay the same in both modes because it pops well on both light and dark surfaces.

#### Scenario: User on iOS Safari with dark mode
- **GIVEN** the user has enabled dark mode in iOS Settings
- **WHEN** they open the Meetit webview inside the Reddit app
- **THEN** the background renders as `#1a1a1b` (dark)
- **AND** the body text renders as `#d7dadc` (light)
- **AND** the yellow header (`#ffff00`) renders the same as in light mode
- **AND** the offset shadows invert to use light color (`#d7dadc`) for visibility

#### Scenario: User on iOS Safari with light mode
- **GIVEN** the user has light mode enabled
- **WHEN** they open the Meetit webview
- **THEN** the background renders as `#fdfae4` (cream)
- **AND** the body text renders as `#1c1c0f` (near-black)
- **AND** the visual is byte-identical to the pre-e21 design

### Requirement: Touch targets meet 44px minimum

All interactive elements SHALL have a minimum height and width of 44px except where explicitly noted (e.g., desc pagers, which are dense in-card navigation and have a 28px compromise).

#### Scenario: User taps a card action button
- **GIVEN** the user is on the home card with the RSVP button visible
- **WHEN** the button is rendered
- **THEN** its `min-height` is 44px
- **AND** its tap target is at least 44×80px (full row width)

#### Scenario: User taps the header refresh icon
- **GIVEN** the user is on the home page
- **WHEN** the refresh icon is rendered
- **THEN** it is at least 44×44px (raised from the previous 36×36)

#### Scenario: User taps a desc pager button
- **GIVEN** the user is in the event details overlay on step 4 (review)
- **WHEN** the prev/next pager is rendered
- **THEN** its `min-height` is 28px (compromise — these are dense in-card pagers, 44px would dominate the card)

### Requirement: Safe-area insets are respected

The app SHALL respect iPhone notch and home-indicator insets via `env(safe-area-inset-*)` on body and overlay chrome.

#### Scenario: User opens the app on iPhone with notch
- **GIVEN** the user is on an iPhone 14 Pro or later (notch device)
- **WHEN** the home page loads
- **THEN** the top of the header is at least `env(safe-area-inset-top)` from the screen edge
- **AND** the bottom of the footer (or last card) is at least `env(safe-area-inset-bottom)` from the screen edge

#### Scenario: User opens the RSVP overlay on iPhone
- **GIVEN** the user is on an iPhone with home indicator
- **WHEN** the RSVP overlay footer is rendered
- **THEN** the footer bottom padding includes `env(safe-area-inset-bottom)`

### Requirement: Dead CSS is removed

CSS rules that are not referenced by any component SHALL be deleted. Specifically, `.idea-card` and `.pending-card` are removed and replaced with semantic variants `.card-shell--pitch` and `.card-shell--pending`.

#### Scenario: Pitch card uses new variant
- **GIVEN** the user is on the My Stuff → Pitches tab
- **WHEN** a pitch card is rendered
- **THEN** its class includes `card-shell--pitch`
- **AND** its background is `var(--pitch-bg)` (was inline `#ffeaa7`)
- **AND** the visual is byte-identical to the pre-e21 design

#### Scenario: Pending mod card uses new variant
- **GIVEN** the user is on the Mod Dashboard → Pending tab
- **WHEN** a pending event card is rendered
- **THEN** its class includes `card-shell--pending`
- **AND** its background is `var(--pending-bg)` (was inline `#ff69b4`)

#### Scenario: Dead CSS is gone
- **GIVEN** the build is complete
- **WHEN** `app.css` is searched for `.idea-card` or `.pending-card` rules
- **THEN** no matching rules are found

### Requirement: Card titles use semantic classes

The home, mod, and my-stuff card titles SHALL use semantic classes (`.card-title-lg`, `.card-title-md`, `.card-title-sm`) instead of inline `style="font-size:..."` declarations.

#### Scenario: Home card title uses card-title-lg
- **GIVEN** the home card renders an event
- **WHEN** the title h3 is inspected
- **THEN** it has class `card-title-lg`
- **AND** its computed `font-size` is 18px and `line-height` is 1.25

#### Scenario: My Stuff card title uses card-title-md
- **GIVEN** the My Stuff overlay renders an RSVP / Event / Pitch
- **WHEN** the title h3 is inspected
- **THEN** it has class `card-title-md`
- **AND** its computed `font-size` is 17px and `line-height` is 1.3

### Requirement: Avatar circles use a shared class

The 36×36 organizer avatar in the event details overlay SHALL use the `.avatar-circle` class. No inline `style="width:36px;..."` blocks.

#### Scenario: Event details organizer avatar
- **GIVEN** the user is on the event details overlay for an event with an organizer
- **WHEN** the organizer avatar is rendered
- **THEN** it has class `avatar-circle`
- **AND** its computed size is 36×36px with a 4px black border
