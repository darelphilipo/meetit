## ADDED Requirements

### Requirement: Approve lock is released in a finally block
The system SHALL release the distributed approve lock in a `finally` block after the approve operation completes, regardless of success or failure.

#### Scenario: Approve succeeds
- **WHEN** `hSet` to `active_events` and `hDel` from `pending_events` both succeed
- **THEN** the lock is released in the finally block
- **AND** the response is `{ success: true }`

#### Scenario: hSet throws
- **WHEN** `hSet` to `active_events` throws an error
- **THEN** the lock is still released in the finally block
- **AND** the error propagates to the catch-all handler

#### Scenario: hDel throws
- **WHEN** `hDel` from `pending_events` throws an error
- **THEN** the lock is still released in the finally block
- **AND** the event may remain in pending_events (data inconsistency logged separately)

#### Scenario: redis.del itself fails
- **WHEN** the lock release `redis.del(lockKey)` call throws
- **THEN** the 10s TTL serves as backup cleanup
- **AND** an error is logged: `[APPROVE] lock-release-failed id={eventId}`

#### Scenario: Mod retries after failure
- **WHEN** a mod sees an error and clicks "Approve" again within 1 second
- **THEN** the new request acquires the lock (because it was released explicitly)
- **AND** the approve completes successfully
