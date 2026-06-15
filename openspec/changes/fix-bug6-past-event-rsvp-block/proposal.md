## Why

`onRsvp` uses `getActiveEvent(eventId)` which filters past dates. But if the `getActiveEvents` cache is stale (Redis is eventually consistent), a past event could be RSVP'd. The fix is a defensive explicit date check at the start of `onRsvp`.

## Priority: 2/5

## Status: proposed

## What Changes

- At the start of `onRsvp`, after `getActiveEvent`, add an explicit date check: `if (event.date < today) return { success: false, error: "Cannot RSVP to past events" }` (HTTP 400).
- Log `[FEATURE] rsvp-past-event-blocked eventId={id} eventDate={d} today={t}`.

## Capabilities

### New Capabilities
- `rsvp-past-event-block`: Explicit server-side check that prevents RSVPing to events whose date has passed.

### Modified Capabilities
- None.

## Impact

- `src/server/server.ts`: add date check in `onRsvp`.
