## ADDED Requirements

### Requirement: CRON reminder retries within 1 hour after event start
The system SHALL attempt to send a missed reminder within 1 hour after the event's start time, in addition to the original pre-event window.

#### Scenario: CRON missed the pre-event window
- **WHEN** the CRON runs and an event's `hoursUntilEvent` is between -1 and 0 (i.e., the event has started within the last hour)
- **AND** no reminder has been sent yet (`remindedKey` not set)
- **THEN** the system sends the reminder and logs `[FEATURE] cron-reminder retry`

#### Scenario: Reminder send fails
- **WHEN** the modmail call throws an error
- **THEN** the system does NOT set `remindedKey`
- **AND** the next CRON cycle can retry
