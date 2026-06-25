## ADDED Requirements

### Requirement: Loading flags reset on any code path
The system SHALL reset loading flags in a `finally` block to guarantee they don't get stuck `true` if the async work throws an error or if the catch block itself throws.

#### Scenario: prefillOrganizer fetch throws
- **WHEN** the `/api/init` fetch in `prefillOrganizer` throws an error
- **THEN** the `prefillLoading` flag is reset to `false`
- **AND** the next call to `prefillOrganizer` can proceed

#### Scenario: loadMySubmissions catch block throws
- **WHEN** the body of `loadMySubmissions` throws and the catch block also throws (e.g., `container.innerHTML` fails)
- **THEN** the `myStuffLoading` flag is reset to `false` via the finally block
- **AND** the user can re-trigger the My Stuff load

#### Scenario: prefillOrganizer succeeds
- **WHEN** the `/api/init` fetch succeeds
- **THEN** the `prefillLoading` flag is reset to `false` in the finally block
- **AND** the organizer field is populated

#### Scenario: loadMySubmissions succeeds
- **WHEN** the `/api/my-submissions` fetch succeeds
- **THEN** the `myStuffLoading` flag is reset to `false` in the finally block
- **AND** the My Stuff body is rendered
