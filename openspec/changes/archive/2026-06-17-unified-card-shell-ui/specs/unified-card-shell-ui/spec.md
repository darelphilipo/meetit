## ADDED Requirements

### Requirement: Card shell provides consistent browse layout
The system SHALL render Home, Mod Dashboard, and My Stuff event cards using a shared card shell with a fixed header, progress dots, a scrollable body, a contextual action row, and a fixed footer navigation bar.

#### Scenario: Home card uses the shell
- **WHEN** the user views the Home screen
- **THEN** the event card fills the available viewport and shows a header, progress dots, body content, action buttons, and footer prev/next controls

#### Scenario: Mod Dashboard card uses the shell
- **WHEN** the user opens the Mod Dashboard and selects the Pending tab
- **THEN** the card uses the shell layout with tab-specific color and action buttons

#### Scenario: My Stuff card uses the shell
- **WHEN** the user opens My Stuff and selects the RSVPs tab
- **THEN** the card uses the shell layout with RSVP-specific action buttons

### Requirement: Progress dots indicate item position
The system SHALL display progress dots below the section header in Home, Mod Dashboard, and My Stuff to indicate the current item index and total count.

#### Scenario: Multiple events show dots
- **WHEN** more than one event exists in the current view
- **THEN** progress dots are visible with the current item highlighted

#### Scenario: Single item hides dots
- **WHEN** only one event exists in the current view
- **THEN** progress dots are hidden or collapsed

### Requirement: Footer navigation controls item carousel
The system SHALL provide Prev and Next buttons in a fixed footer to move between items in Home, Mod Dashboard, and My Stuff.

#### Scenario: Prev is disabled at first item
- **WHEN** the user is viewing the first item
- **THEN** the Prev button is hidden or disabled

#### Scenario: Next is disabled at last item
- **WHEN** the user is viewing the last item
- **THEN** the Next button is hidden or disabled

### Requirement: Tab-specific action buttons remain contextual
The system SHALL show action buttons appropriate to each tab and view without changing the outer shell structure.

#### Scenario: Pending mod actions
- **WHEN** the user views a pending event in the Mod Dashboard
- **THEN** the action row shows Approve and Decline buttons

#### Scenario: My Stuff RSVP actions
- **WHEN** the user views an RSVP in My Stuff
- **THEN** the action row shows Update Contact and Leave buttons
