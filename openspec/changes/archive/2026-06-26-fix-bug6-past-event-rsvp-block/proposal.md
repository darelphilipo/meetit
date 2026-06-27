## Why

`onRsvp` uses `getActiveEvent(eventId)` which filters past dates. But if the `getActiveEvents` cache is stale (Redis is eventually consistent), a past event could be RSVP'd. The fix is a defensive explicit date check at the start of `onRsvp`.

## Priority: 2/5

## Status: shipped (2026-06-26, pre-launch bug fixes — FIX-02)

## Audit (2026-06-19)

**Bug is fully open — no implicit block exists.** The original audit (2026-06-17) incorrectly stated that `getActiveEvent()` filters past dates. It does not:

```ts
// server.ts:242-245
async function getActiveEvent(eventId: string): Promise<MeetitEvent | undefined> {
  const eventJson = await redis.hGet("meetit:active_events", eventId);
  return eventJson ? safeJSONParse(eventJson) : undefined;
}
```

`getActiveEvent` is a direct `hGet` on `meetit:active_events` — no date filter at all. Only `getActiveEvents()` (plural, line 226) has the date filter, but `onRsvp` calls the singular `getActiveEvent`.

**Impact:** If a past event is still in `meetit:active_events` (no cleanup), `getActiveEvent` returns it and RSVP proceeds without any date check. The `if (!event)` guard never triggers. The explicit date check in the proposal is necessary, not optional.

**Recommendation:** ~15 minutes to add the explicit check + logging.

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
