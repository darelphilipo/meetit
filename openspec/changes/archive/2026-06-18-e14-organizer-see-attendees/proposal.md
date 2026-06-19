## Why

Right now only mods can see the full attendee list for an event. Organizers submit an event, get approved, see RSVPs roll in, but cannot see **who** is going. The `onExportAttendees` endpoint already exists and already enforces `isSubmissionOwner` (organizer OR mod can read the list); what is missing is a client-side entry point in the organizer's My Stuff view.

The fix is small: add a "👥 See Attendees" button on the organizer's own published event cards in My Stuff, wire it to the existing `showModAttendees(id)` overlay.

## Priority: 3/5

## Status: proposed

## What Changes

- In `renderMyEventCard()` for published events owned by the current user, add a "👥 See Attendees" button next to the existing Delete (and future Edit) buttons.
- The button label includes the current RSVP count: "👥 5 Attendees" / "👥 1 Attendee" (proper singular/plural).
- The button uses `data-action="view-attendees-organizer"` and `data-id={eventId}`.
- New `case "view-attendees-organizer":` in `handleAction()` calls the existing `showModAttendees(id)` (the function name is mod-branded but it already does the right check server-side).
- Add a "📊 RSVP Trend" line below the count for approved events: simple "📈 +3 this week" derived from existing `rsvpCount` (no new data; based on `lastModified` vs RSVP events). For v1, the trend line is optional; the button is the core deliverable.
- No server changes. `onExportAttendees` already works for organizers.
- Log `[FEATURE] view-attendees-organizer eventId={id} rsvpCount={n}` to the debug panel on every tap.

## Capabilities

### New Capabilities
- `organizer-attendees`: Organizers can see the full attendee list for their own published events via the existing attendee overlay. No new server code; the existing `onExportAttendees` endpoint already authorizes the organizer.

### Modified Capabilities
- None.

## Impact

- `src/client/app.ts`: new button in `renderMyEventCard()` for `status === "published"` cards owned by the current user; new `case "view-attendees-organizer"` in `handleAction()`.
- `public/app.html`: no CSS changes (reuses existing `.btn .btn-white .btn-sm`).
- `LEARNINGS.md`: no new section needed (the pattern is already documented in §0.2 logging and §13 privacy pattern from skills.md).

## Out of Scope

- Showing contact info (email, phone) to organizers — privacy pattern from skills.md §13 says this is mod-only. Organizers see Reddit usernames, nothing more.
- Letting organizers remove attendees — that is mod-only.
- Per-RSVP timestamps shown in the attendee list — could be a future enhancement but adds a `hGetAll` call we don't need for v1.

## Decisions (to be made during design phase)

- **Trend line:** defer the "📈 +3 this week" line to a follow-up. v1 is just the button + count.
- **Singular vs plural:** "1 Attendee" (no s) / "N Attendees" (with s). Standard English.
- **Button position:** right of Delete, before the future Edit button (Edit comes from e2-edit-event; do not block on it).
- **Empty state:** when `rsvpCount === 0`, the button reads "👥 0 Attendees" (still clickable; the overlay shows "No one has RSVP'd yet"). No special-cased hidden state.
