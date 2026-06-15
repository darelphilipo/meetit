## Why

Event RSVPs are currently unlimited. There's no concept of capacity, no "3/20 spots filled" indicator, and no urgency or scarcity to drive conversion. For a meetup app, capacity is the single biggest conversion lever — users are far more likely to commit when they can see the event filling up.

## Priority: 4/5

## Status: proposed

## What Changes

- Add an optional `maxAttendees` field to event creation (number, must be > 0, default = unlimited).
- Show capacity badge on home card: "🎟️ 3/20 going" with color (gray < 50%, yellow 50–89%, red 90%+).
- Show capacity progress bar on event details overlay.
- Block new RSVPs when capacity is reached; show "🚫 Event full" state on the home card and detail overlay.
- Allow the organizer to set/update `maxAttendees` via the create and edit forms.
- Persist `maxAttendees` in the event hash (`meetit:event:{id}`).
- Server validates and enforces the cap in `onRsvp`; returns a clear 409 `Event full` error.

## Capabilities

### New Capabilities
- `event-capacity`: Optional max-attendee field on events, with progress UI, hard cap, and clear full state.

### Modified Capabilities
- None.

## Impact

- `src/shared/api.ts`: add `maxAttendees?: number` to `Event` and `CreateEventFormData`.
- `src/server/server.ts`: new `getEventCapacity()` helper, capacity check in `onRsvp`, new error code.
- `src/client/app.ts`: capacity badge in `renderHomeCard`, progress bar in detail overlay, full-event state.
- `public/app.html`: new capacity progress bar CSS, full-event banner.
- `LEARNINGS.md`: log capacity decision in §0.2 / new section.

## Out of Scope

- Waitlist (could be added later; would need its own change).
- RSVP cancellation when capacity drops (overcomplicated for v1; "leave" already exists).
- Per-category default capacities.
