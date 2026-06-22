## ADDED Requirements

> **Status:** All requirements in this spec are **DEFERRED to v2+**. They are documented for traceability and to inform future planning. None of these requirements will be implemented in the current version.
>
> See `openspec/changes/low-value-enhancements/proposal.md` for rationale on why each item was deferred.

### Requirement: Mod action toast announces the next event
The system SHALL show a toast after a mod approves, declines, or dismisses an event in the mod dashboard, announcing the title of the next event in the queue.

> **Status:** DEFERRED (low value — mod can already see next card, action toast confirms what happened, card dots show position)

#### Scenario: Mod approves event in a multi-item queue
- **WHEN** the mod approves an event that is not the last in the queue
- **THEN** a toast appears with text "Event approved! Next: [next event title]"

#### Scenario: Mod approves the last event in the queue
- **WHEN** the mod approves the only remaining event
- **THEN** the existing "Event approved!" toast appears (no "next" suffix)

### Requirement: My Stuff preserves viewed card across data refresh
The `loadMySubmissions` function SHALL preserve the user's current viewing position across data refreshes, when the viewed event still exists in the refreshed data.

> **Status:** DEFERRED (edge case — visibility change handler rarely fires; complex to track by ID and resolve to new index)

#### Scenario: Refresh while viewing an event that still exists
- **WHEN** the user is viewing event X at index 3 in `My Stuff → RSVPs`
- **AND** `loadMySubmissions` refreshes the data
- **AND** event X is still in the refreshed data
- **THEN** the user continues viewing event X (which may now be at a different index)

#### Scenario: Refresh while viewing an event that was deleted server-side
- **WHEN** the user is viewing event X at index 3 in `My Stuff → RSVPs`
- **AND** `loadMySubmissions` refreshes the data
- **AND** event X is no longer in the refreshed data
- **THEN** the index falls back to the previous index clamped to the new array length

### Requirement: Overlay navigation uses a returnTo stack
The overlay navigation system SHALL track the origin screen of each overlay and return to that screen on close, instead of always closing to the home page.

> **Status:** DEFERRED (high risk — architectural change, touches 40+ call sites of `closeOverlay()`, requires conditional `resetEventForm()` side effect)

#### Scenario: User opens event details from home, then closes
- **WHEN** the user taps an event card on the home page (opening the details overlay)
- **AND** the user taps the close button on the details overlay
- **THEN** the user returns to the home page (current behavior — no regression)

#### Scenario: User opens event details from My Stuff, then closes
- **WHEN** the user taps an event in `My Stuff → RSVPs` (opening the details overlay)
- **AND** the user taps the close button on the details overlay
- **THEN** the user returns to `My Stuff → RSVPs` (improved behavior)

#### Scenario: User opens nested overlay (details → RSVP form), then closes
- **WHEN** the user opens details overlay, then opens RSVP form from within
- **AND** the user closes the RSVP form
- **THEN** the user returns to the details overlay (not home)

### Requirement: Mod dashboard offers a list view option
The mod dashboard SHALL provide a toggle between card view (current) and list view for each tab (Pending, Published, Pitches).

> **Status:** DEFERRED (feature request — no current demand; card view works for 2-5 pending events)

#### Scenario: Mod switches to list view in Pending tab
- **WHEN** the mod taps the view-mode toggle while on the Pending tab
- **THEN** the dashboard re-renders the pending events as a scrollable list
- **AND** each list row shows: emoji, title, date, status badge

#### Scenario: Mod taps a row in list view
- **WHEN** the mod is in list view on the Pending tab
- **AND** the mod taps a row
- **THEN** the same detail overlay opens as if they had tapped Details on a card

### Requirement: Home card carousel shows a page counter
The home card carousel SHALL display a "3 / 27" style page counter when there are more than 5 events, so users know how many events they can browse.

> **Status:** DEFERRED (feature request — no current demand; carousel works for 5-10 events)

#### Scenario: Home has 27 published events
- **WHEN** the home page loads and there are 27 events
- **THEN** the carousel shows "3 / 27" near the navigation arrows

#### Scenario: Home has 3 published events
- **WHEN** the home page loads and there are 3 or fewer events
- **THEN** no page counter is shown (carousel is trivial at this size)

### Requirement: App supports deep linking to specific views
The app SHALL support URL-based deep linking so external links (from Reddit feeds, comments, or share posts) can open the app at a specific view (event, mod dashboard, My Stuff tab).

> **Status:** DEFERRED (feature request — no current demand; requires navigation stack foundation from the "Navigation returnTo stack" requirement above)

#### Scenario: External link to a specific event
- **WHEN** a user clicks a link like `?screen=event&id=abc123`
- **THEN** the app opens with that event's details overlay active

#### Scenario: External link to mod dashboard
- **WHEN** a mod clicks a link like `?screen=mod&tab=pending`
- **THEN** the app opens with the mod dashboard on the Pending tab

## Out of Scope

- All 6 requirements above are DEFERRED to v2+. Documented here for traceability.
- The high-value bug fixes (My Stuff skip-after-delete, Mod queue reset-to-0) were shipped separately as direct commits and are NOT part of this spec.
