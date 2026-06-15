## ADDED Requirements

### Requirement: Users can opt in to push notifications per RSVP
The system SHALL allow users to opt in to push notifications for a specific event. The opt-in is stored in Redis as `meetit:notify_opt_in:{eventId}:{username} = 1` with a 7-day TTL.

#### Scenario: User opts in after RSVP
- **WHEN** the user checks the "🔔 Remind me before this event" checkbox in the RSVP success state
- **THEN** the server stores the opt-in key in Redis
- **AND** the toast "Notification preference saved" is shown

#### Scenario: User opts out
- **WHEN** the user unchecks the checkbox
- **THEN** the server removes the opt-in key
- **AND** the toast "Notification preference saved" is shown

### Requirement: Push delivery is gated on Devvit approval
The system SHALL NOT attempt to send push notifications until Devvit push notification permissions are approved. The opt-in storage is the only behavior in scope until then.

#### Scenario: Push not yet approved
- **WHEN** the CRON reminder job runs and finds an opt-in
- **THEN** the system logs `[FEATURE] notify-opt-in would-send` instead of calling `reddit.sendPushNotification`
