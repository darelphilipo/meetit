# form-input-alignment Specification

## Purpose
Form input alignment fixes for iOS Safari, ensuring date and time inputs render with equal width and aligned edges across all devices.

## Requirements

### Requirement: Date and time inputs render with equal width on iOS Safari

The event submission form's date and time inputs SHALL render with equal width and aligned top/bottom edges on iOS Safari, where native date/time inputs default to different padding.

#### Scenario: Form row uses grid layout
- **WHEN** the user views the event form's date+time row in step 2
- **THEN** the row uses `display: grid; grid-template-columns: 1fr 1fr; gap: 10px` (not flex)
- **AND** both the date and time inputs are guaranteed equal width

#### Scenario: iOS Safari native appearance reset
- **WHEN** the user views the form on iOS Safari
- **THEN** both `input[type="date"]` and `input[type="time"]` have `appearance: none; -webkit-appearance: none;`
- **AND** the native picker icon padding is removed
- **AND** the date and time inputs render with the same custom styling

#### Scenario: Labels align horizontally
- **WHEN** the user views the date and time labels
- **THEN** the `DATE *` and `TIME *` labels are at the same vertical position
- **AND** the inputs below them are at the same vertical position
- **AND** the two columns have the same width
