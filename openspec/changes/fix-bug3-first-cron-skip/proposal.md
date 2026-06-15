## Why

In `onCheckEvents`, `lastCheck` is initialized to `"0"`. On the first CRON run, `submittedAt > 0` is true for ALL existing pending items, triggering a mod alert for every existing event. Mods get spammed with alerts for items they've already seen.

## Priority: 3/5

## Status: proposed

## What Changes

- Initialize `lastCheck` to the current timestamp on first CRON run.
- Detect "first run" by checking if `lastCheck` is `"0"` or missing; if so, set it to `Date.now()` and skip alerts.
- Log `[CRON] first-run skipping-alerts lastCheckInitialized={ts} skipped={n}`.

## Capabilities

### New Capabilities
- `cron-first-run-skip`: Suppress mod alerts on the first CRON run; initialize `lastCheck` to current time.

### Modified Capabilities
- None.

## Impact

- `src/server/server.ts`: add first-run detection in `onCheckEvents`.

## Note

This is already fixed in v1.3.3 (PERF3 release). This OpenSpec change documents the existing behavior and ensures it doesn't regress.
