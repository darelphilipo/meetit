# empty-and-error-states Specification

## Purpose
TBD - created by archiving change e22-empty-and-error-states. Update Purpose after archive.
## Requirements
### Requirement: Empty states are rendered through a helper

All empty-state UI SHALL be produced by the `renderEmptyState()` helper. Ad-hoc inline `<div class="empty-state">` blocks SHALL NOT be used.

#### Scenario: Home first-use empty state
- **GIVEN** the home page has no events
- **WHEN** the home page renders
- **THEN** the empty state shows the 🐱 emoji, "Wow, so empty!" headline, body "No events yet — be the first spark ✨"
- **AND** shows two CTAs: "💡 Pitch Idea" (pink) and "📋 Submit Event" (white)

#### Scenario: My Stuff RSVPs empty state
- **GIVEN** the user has no RSVPs
- **WHEN** the My Stuff → RSVPs tab renders
- **THEN** the empty state shows the 🎟️ emoji, "No RSVPs yet" headline, body "Browse the Home tab to find your people ✨"
- **AND** shows a single CTA: "← Back to Home" (white)

#### Scenario: My Stuff Pitches empty state
- **GIVEN** the user has no pitches
- **WHEN** the My Stuff → Pitches tab renders
- **THEN** the empty state shows the 💡 emoji, "No pitches yet" headline, body "Got an idea? Pitch it from the Create menu"
- **AND** shows a single CTA: "💡 Pitch an Idea" (pink)

#### Scenario: My Stuff Events empty state
- **GIVEN** the user has no events
- **WHEN** the My Stuff → Events tab renders
- **THEN** the empty state shows the 📋 emoji, "No events yet" headline, body "Submit an event from the Create menu!"
- **AND** shows a single CTA: "📋 Submit Event" (white)

#### Scenario: Mod dashboard empty states
- **GIVEN** a mod is viewing a tab with no items
- **WHEN** the mod dashboard renders the Pending / Published / Pitches tab
- **THEN** each empty state shows a relevant emoji (📋 / ✅ / 💡) and a body line explaining what will appear
- **AND** shows no CTAs (mods have other navigation options in the header)

#### Scenario: Search filter empty state
- **GIVEN** the user has typed a search query that matches no events
- **WHEN** the search executes
- **THEN** the empty state shows the 🔍 emoji, "Nothing matches that vibe" headline, and a body line including the search query

#### Scenario: Inline attendees empty state
- **GIVEN** an event has no RSVPs
- **WHEN** the event details step 3 renders
- **THEN** the empty state shows the 👥 emoji and "No one yet — be the first!" headline
- **AND** uses the compact variant (smaller padding/emoji)

### Requirement: Error states are rendered through a helper

All user-visible error states SHALL be produced by the `renderErrorState()` helper. Silent-fail sites SHALL at minimum show a toast.

#### Scenario: Home page fails to load
- **GIVEN** `/api/home` returns a non-200 or times out
- **WHEN** the fetch fails
- **THEN** the home page shows the 😿 emoji and "Couldn't load events" headline
- **AND** shows a "🔄 Tap to retry" CTA that dispatches the `refresh-home` action

#### Scenario: My Stuff fails to load
- **GIVEN** `/api/my-submissions` returns a non-200 or times out
- **WHEN** the fetch fails
- **THEN** the My Stuff container shows the 😿 emoji and "Couldn't load My Stuff" headline
- **AND** shows a "🔄 Tap to retry" CTA that dispatches the `open-my-stuff` action

#### Scenario: Mod attendees fails to load
- **GIVEN** `/api/rsvp-list` returns a non-200 or times out
- **WHEN** the fetch fails
- **THEN** the mod attendees body shows the 😿 emoji and "Couldn't load attendees" headline
- **AND** shows a "🔄 Tap to retry" CTA that dispatches the `view-attendees-mod` action

#### Scenario: Silent failure sites now show a toast
- **GIVEN** any fetch silently fails (e.g., `/api/rsvp-list` from the details overlay)
- **WHEN** the fetch fails
- **THEN** a toast appears with "Couldn't load" and the error type
- **AND** the user is not left wondering whether the action succeeded

### Requirement: Loading states use a skeleton helper

All user-visible loading states (except the initial app load) SHALL be produced by the `renderSkeleton()` helper. Inline "⏳ Loading..." text SHALL NOT be used.

#### Scenario: My Stuff initial load
- **GIVEN** the user opens My Stuff for the first time
- **WHEN** `/api/my-submissions` is fetching
- **THEN** the container shows 4 skeleton bars with a shimmer animation
- **AND** the bars taper from 100% to 55% width

#### Scenario: Mod attendees loading
- **GIVEN** the mod opens the attendees overlay
- **WHEN** `/api/rsvp-list` is fetching
- **THEN** the body shows 3 compact skeleton bars with a shimmer animation

#### Scenario: Skeleton respects reduced motion
- **GIVEN** the user has `prefers-reduced-motion: reduce` enabled
- **WHEN** a skeleton renders
- **THEN** the shimmer animation does NOT play (the global `prefers-reduced-motion` rule kills all `*` animations)

### Requirement: Required form fields have visible markers

Every required form field SHALL have a `<span class="req">*</span>` marker after its label. The marker is red (`var(--secondary)`) and bold.

#### Scenario: Submit Event required fields
- **GIVEN** the user is on the Submit Event overlay
- **WHEN** the form renders
- **THEN** the labels for Title, Date, Time, Location, and Description all show a red `*` after the field name
- **AND** the Category label retains its existing red `*` (which was already there pre-e22)

#### Scenario: Pitch required fields
- **GIVEN** the user is on the Pitch an Idea overlay
- **WHEN** the form renders
- **THEN** the labels for Title and Description show a red `*` after the field name
- **AND** the Date and Time labels show "(optional)" and have no `*` (matching pre-e22 behavior)

### Requirement: Form validation shows inline errors

When a user attempts to advance or submit a form with missing required fields, an inline error SHALL appear below each missing field. The error is a 12px red message. The field also gets a 3px red box-shadow outline.

#### Scenario: User clicks Next with empty title
- **GIVEN** the user is on Submit Event step 1
- **WHEN** the user clicks "Next →" with an empty Title field
- **THEN** the Title input gets a red box-shadow
- **AND** a "Title is required" error appears below the input
- **AND** a "Fix the highlighted fields" toast also appears

#### Scenario: User fixes the field
- **GIVEN** the Title field has an inline error
- **WHEN** the user types into the Title input
- **THEN** the inline error is removed
- **AND** the red box-shadow is removed

#### Scenario: User clicks Submit with multiple empty fields
- **GIVEN** the user is on Submit Event step 4 (review)
- **WHEN** the user clicks "✓ Submit Event" with multiple empty required fields
- **THEN** each empty required field gets its own inline error
- **AND** the form does NOT submit
- **AND** a "Fix the highlighted fields" toast appears

