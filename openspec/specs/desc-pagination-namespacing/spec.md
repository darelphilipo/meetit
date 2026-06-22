# desc-pagination-namespacing Specification

## Purpose
Description pagination fix — ensures page index state is namespaced per event ID so multiple cards don't share pagination state.

## Requirements
### Requirement: Mod detail pagination state uses a separate namespace
The system SHALL maintain description pagination state for the mod detail overlay in a separate namespace from the user detail overlay, so the two overlays can be open simultaneously for the same event without cross-contamination.

#### Scenario: User opens detail, then mod opens mod detail for same event
- **WHEN** a user has the event details overlay open at page 2 of a long description
- **AND** a mod opens the mod detail overlay for the same event
- **THEN** the mod detail starts at page 1
- **AND** the user's pagination state is preserved at page 2

#### Scenario: Mod paginates while user overlay is open
- **WHEN** the mod navigates from page 1 to page 3 in the mod detail
- **THEN** the user's detail overlay pagination is unaffected
- **AND** the user's overlay still shows page 2 (or whatever page they were on)

#### Scenario: Mod closes, user re-opens
- **WHEN** the mod closes the mod detail overlay
- **AND** the user re-opens the user detail overlay
- **THEN** the user's previous pagination state is restored

### Requirement: Mod detail uses its own state records
The mod detail description pagination SHALL use `modDescFullText`, `modDescPageIdx`, and `modDescPageTotal` global records. The user detail overlay continues to use `descFullText`, `descPageIdx`, and `descPageTotal`.

#### Scenario: Mod handler reads from mod namespace
- **WHEN** the `mod-detail-desc-next` action is dispatched
- **THEN** it reads and writes only to the `modDesc*` records
- **AND** it does not read or write to the user detail records

#### Scenario: User handler reads from user namespace
- **WHEN** the `desc-next` action is dispatched
- **THEN** it reads and writes only to the `desc*` records
- **AND** it does not read or write to the mod detail records

