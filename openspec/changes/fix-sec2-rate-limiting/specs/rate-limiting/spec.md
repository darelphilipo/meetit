## ADDED Requirements

### Requirement: Per-user rate limit on RSVP and submission endpoints
The system SHALL limit each user to a configurable number of RSVP and submission actions per hour using a Redis sorted set sliding window. Moderators are exempt.

#### Scenario: User exceeds RSVP rate limit
- **WHEN** the user has submitted 20 RSVPs in the past hour
- **THEN** the 21st RSVP request returns HTTP 429 with `{ error: "Rate limit exceeded" }`
- **AND** the client toast shows "⏸️ Slow down! Try again in N minutes"

#### Scenario: Limit resets after 1 hour
- **WHEN** the user waits 1 hour and retries
- **THEN** the request is allowed

#### Scenario: Moderator is exempt
- **WHEN** a moderator (verified via `requireMod`) submits an RSVP
- **THEN** the rate limit is bypassed

### Requirement: Rate limit configuration
The system SHALL apply the following default limits:
- RSVP / Leave: 20/hour
- Submit event: 5/hour
- Submit pitch: 10/hour

#### Scenario: Apply configured limits
- **WHEN** the rate limiter is invoked on `/api/rsvp` for a non-mod user
- **THEN** the limit of 20 per hour is enforced
- **AND** a 21st request in the same hour is denied with HTTP 429
