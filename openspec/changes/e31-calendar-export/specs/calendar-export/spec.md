## ADDED Requirements

### Requirement: Event details shows "Add to Calendar" button
The event details overlay SHALL show a "📅 Add to Calendar" row with a "Google" button. The button SHALL appear below the existing "🗺️ Google Maps" row in the description card (Card 2).

#### Scenario: User opens event details
- **WHEN** the user opens the event details overlay for any event
- **THEN** the description card (Card 2) shows a "📅 Add to Calendar" row
- **AND** the row contains a "Google" button

#### Scenario: Event has no time (all-day)
- **WHEN** the event has an empty `time` field
- **THEN** the button still appears
- **AND** clicking it opens Google Calendar with a default start time of 00:00 and a 1-hour duration

### Requirement: RSVP success card shows "Add to Calendar" button
The RSVP success card (Card 4 when `hasRsvped=true`) SHALL show a "📅 Add to Calendar" button as a separate row above the existing Update/Leave buttons. The calendar action has its own visual weight (different intent: "save for later") and is not constrained to the same flex row as the RSVP actions.

#### Scenario: User has RSVPed to an event
- **WHEN** the user opens the event details for an event they have RSVPed to
- **THEN** the success card shows a "📅 Add to Calendar" button as the first action button
- **AND** the existing "✏️ Update" and "❌ Leave" buttons are below it in a horizontal flex row

#### Scenario: User has not yet RSVPed
- **WHEN** the user opens the event details for an event they have not RSVPed to
- **THEN** the RSVP form card is shown instead of the success card
- **AND** the calendar button is not shown on the RSVP form (they need to RSVP first)

### Requirement: Button opens Google Calendar with prefilled event
Tapping the "Google" button SHALL navigate the user to a Google Calendar "Add Event" URL with the event's title, start date+time, end date+time (start + 1 hour), location, and description prefilled. The Google Maps URL (if present) SHALL be appended to the description as a separate line.

#### Scenario: Event with full data
- **WHEN** the user taps "Add to Calendar" on an event titled "Coffee Meetup" with date "2026-06-25", time "22:50", location "Central Park", description "Casual chat", and a mapUrl
- **THEN** the user is navigated to `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Coffee%20Meetup&dates=...&location=Central%20Park&details=Casual%20chat%0A%0A%F0%9F%97%BA%20...`
- **AND** the dates parameter contains the start time in UTC (converted from local time using `appTimezone`) and an end time 1 hour later

#### Scenario: Event with missing optional fields
- **WHEN** the event has an empty `location` or `description` field
- **THEN** the corresponding URL parameter is empty
- **AND** Google Calendar displays a valid event with just the title and time

#### Scenario: Network failure fetching event details
- **WHEN** the `/api/event-details` request fails or returns a non-event-details response
- **THEN** the app shows an error toast: "Couldn't load event"
- **AND** the user is NOT navigated to Google Calendar
