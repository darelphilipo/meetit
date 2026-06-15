## ADDED Requirements

### Requirement: Confirm dialog uses a per-instance resolver
The system SHALL use a unique resolver per confirm dialog instance, stored on the overlay element, to prevent one confirm's resolution from overwriting another's.

#### Scenario: Two confirms triggered rapidly
- **WHEN** the user rapidly taps two different delete buttons
- **THEN** both confirm dialogs open
- **AND** each one resolves independently with its own user choice
- **AND** no button is left in a locked state
