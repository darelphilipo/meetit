## Why

`getAllApprovedEvents` filters out `e.id !== "default-bangalore-tech-chai"` — a hardcoded magic string. If the ID format changes or another default event is added, the filter breaks and default events appear in the mod dashboard.

## Priority: 2/5

## Status: proposed

## Audit (2026-06-19)

**Bug is still present.** Current code at `server.ts:477`:
```ts
const realEvents = events.filter(e => e.id !== "default-bangalore-tech-chai");
```

Hardcoded magic string unchanged. If the default event ID format changes or another default event is added, the filter silently breaks.

**Recommendation:** ~5 minutes. Single line change: `!e.id.startsWith("default-")`. Tasks: 0/7 — all still pending.

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
