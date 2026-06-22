# first-cron-skip Specification

## Purpose
First cron skip fix — prevents the first CRON tick from processing events that were just created, using a grace period flag.

## Requirements
### Requirement: First CRON run suppresses mod alerts
The system SHALL initialize `lastCheck` to the current timestamp on the first CRON run and skip the mod alert loop for that run.

#### Scenario: First CRON run
- **WHEN** the CRON runs and `lastCheck` is `"0"` or missing
- **THEN** the system sets `lastCheck = Date.now().toString()`
- **AND** does NOT send mod alerts for existing pending items
- **AND** logs `[CRON] first-run skipping-alerts`

