# e31-calendar-export

**Priority:** 3/5 (standard enhancement)

## Why

A "Add to Calendar" button is a standard expected feature for event apps. Users who RSVP want a frictionless way to save the event to their personal calendar. Adding this now (while Meetit is in active use) prevents users from manually transcribing dates/times, which is a real friction point.

The Google Calendar deep link approach is the highest ROI: 10 lines of code, works on iOS + desktop, no downloads, no external dependencies.

## What changes

- New client-side helper `buildGoogleCalendarUrl(event)` that converts a Meetit event into a Google Calendar "Add Event" URL
- New "📅 Add to Calendar" row on event details overlay (Card 2, below the Maps row)
- New "📅 Add to Calendar" button on RSVP success card (Card 4, separate row above Update/Leave)
- New action handler `add-to-calendar` that fetches event details, builds the URL, and navigates
- No server changes required (uses existing `/api/event-details` endpoint)

## Out of scope

- .ics file clipboard copy (Google Calendar deep link is sufficient for the highest-ROI version; can add .ics later as a follow-up if users ask)
- Apple Calendar (`webcal://`) support — Google Calendar covers iOS users via Safari/app prompt
- Outlook/Yahoo direct links — same UI shape could be added later
- Calendar export from My Stuff → RSVPs card (event details + RSVP success are the natural moments)
- Custom end times (defaults to start + 1 hour; events don't have an end-time field)

## Capabilities

### New Capabilities
- `calendar-export`: Google Calendar deep link on event details + RSVP success

## Impact

- `src/client/app.ts`: +60 lines (1 helper + 2 button placements + 1 handler)
- `openspec/specs/calendar-export/spec.md`: new spec (3 requirements, 6 scenarios)
- `openspec/changes/e31-calendar-export/`: change proposal for archival

## Task list

See `tasks.md`.
