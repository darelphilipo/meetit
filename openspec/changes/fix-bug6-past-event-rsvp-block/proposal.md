## Why

`onRsvp` uses `getActiveEvent(eventId)` which filters past dates. But if the `getActiveEvents` cache is stale (Redis is eventually consistent), a past event could be RSVP'd. The fix is a defensive explicit date check at the start of `onRsvp`.

## Priority: 2/5

## Status: partial

## Audit (2026-06-17)

**Partially implemented — implicit block exists.** `onRsvp` calls `getActiveEvent(eventId)` (`server.ts:369`), which internally filters past dates at `server.ts:233` via `.filter((e) => new Date(e.date + "T00:00:00").getTime() >= today.getTime())`. If the event is past, `getActiveEvent` returns `undefined`, and the `if (!event)` guard at `server.ts:370` catches it and returns a 404 error.

However, the proposal's explicit check (`if (event.date < today) return { error: "Cannot RSVP to past events" }` at the top of `onRsvp`) is **not implemented**. The blocking depends on `getActiveEvent`'s internal filter, which:
1. Is indirect — a future code change to `getActiveEvent` could accidentally remove the filter
2. Returns a generic 404 instead of a clear "Cannot RSVP to past events" message
3. Doesn't log the specific `rsvp-past-event-blocked` log entry

**Recommendation:** Still worth doing the explicit check for clarity + logging. ~15 minutes.

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
