# pitch-dismiss-refresh Specification

## Purpose
TBD - created by archiving change pitch-dismiss-refresh. Update Purpose after archive.
## Requirements
### Requirement: Mod dismiss refetches with fresh counts
The system SHALL refetch the mod Pitches tab from the server after a successful dismiss, so the cross-filter counts (`pending`, `dismissed`) are correct immediately and the "View dismissed (N)" link appears in the empty state without requiring a tab switch or page refresh.

#### Scenario: Dismiss leaves the empty state with correct counts
- **WHEN** a moderator dismisses a pitch and the pending view is the active tab
- **THEN** the system calls `loadModTab("pitches")` after the server confirms the dismiss
- **AND** the server returns `counts: { pending: 0, dismissed: 1, all: 1 }` (or the correct values for the data set)
- **AND** the empty state renders the "🗑️ View dismissed (1)" link (because `counts.dismissed > 0` is now true)
- **AND** the "← Back to pending" link is NOT shown (the current filter IS "pending")

#### Scenario: Cache is invalidated before refetch
- **WHEN** a moderator dismisses a pitch
- **THEN** the system deletes `modTabCache["pitches"]` before calling `loadModTab("pitches")`
- **AND** the next `loadModTab("pitches")` call hits the server, not the cache

#### Scenario: Non-dismiss flows are unaffected
- **WHEN** any action other than `dismissIdea` modifies the Pitches tab
- **THEN** the existing `renderModPitches` optimistic-splice pattern (used in no other code path) is NOT applied
- **AND** the existing `approveEvent` and `deleteEvent` refetch patterns continue to work unchanged

