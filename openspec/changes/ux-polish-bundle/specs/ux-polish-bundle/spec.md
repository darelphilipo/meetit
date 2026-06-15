## ADDED Requirements

### Requirement: Debug toggle does not overlap card content on small screens
The system SHALL ensure the debug toggle button does not overlap the main content on screens narrower than 600px.

#### Scenario: Mobile viewport
- **WHEN** the viewport is 375px wide
- **THEN** the debug toggle is positioned in the header (not floating over content)

### Requirement: My Stuff shows a loading indicator during tab switches
The system SHALL display a loading spinner or skeleton in the My Stuff body when the user switches between tabs (RSVPs, Events, Pitches).

#### Scenario: Switch to Events tab
- **WHEN** the user taps the "Events" tab in My Stuff
- **THEN** the body shows a loading indicator until the events data is fetched
- **AND** then renders the events

### Requirement: Mod actions use the setBtnLoading helper
The `approveEvent` and `deleteEvent` actions in `app.ts` SHALL use the `setBtnLoading` helper instead of manually managing button opacity, pointer-events, and text.

#### Scenario: Approve event
- **WHEN** the user clicks "Approve"
- **THEN** the button is disabled and shows "⏳ Approving..." via `setBtnLoading`
- **AND** is restored on success or failure
