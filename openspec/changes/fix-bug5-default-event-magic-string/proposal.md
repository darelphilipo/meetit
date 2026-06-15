## Why

`getAllApprovedEvents` filters out `e.id !== "default-bangalore-tech-chai"` — a hardcoded magic string. If the ID format changes or another default event is added, the filter breaks and default events appear in the mod dashboard.

## Priority: 2/5

## Status: proposed

## What Changes

- Replace the exact-string check with a prefix check: `!e.id.startsWith("default-")`
- Or, ideally, store default event IDs in a Redis set: `meetit:default_event_ids`. Filter via `SISMEMBER`.

## Capabilities

### New Capabilities
- `default-event-filter`: Robust filtering of system-generated default events from the mod dashboard.

### Modified Capabilities
- None.

## Impact

- `src/server/server.ts`: update `getAllApprovedEvents` filter logic.

## Why Low Priority

The default event ID format has been stable. The fix is one line.
