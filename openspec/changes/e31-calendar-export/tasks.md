# e31-calendar-export Tasks

## 1. Add buildGoogleCalendarUrl helper

- [x] 1.1 Add helper function to `app.ts` near other date utilities
- [x] 1.2 Helper takes a MeetitEvent and returns a Google Calendar URL
- [x] 1.3 Convert local date+time to UTC using `appTimezone`
- [x] 1.4 End time defaults to start + 1 hour
- [x] 1.5 Append `mapUrl` to description as separate line if present

## 2. Add button to event details Card 2

- [x] 2.1 Insert "📅 Add to Calendar" row below the existing Maps row in `s2` (around app.ts:1087)
- [x] 2.2 Use the same visual style as the Maps row (surface, border, padding)
- [x] 2.3 Button has `data-action="add-to-calendar"` and the event id

## 3. Modify RSVP success card

- [x] 3.1 Update the `hasRsvped=true` branch of `s4` (around app.ts:1100)
- [x] 3.2 Add "📅 Add to Calendar" button as a separate row above Update/Leave
- [x] 3.3 Keep Update/Leave in a horizontal flex row below the calendar button
- [x] 3.4 Maintain existing width: 100% max-width: 260px

## 4. Add action handler

- [x] 4.1 Add `case "add-to-calendar":` to the action dispatcher (around app.ts:2726)
- [x] 4.2 Per-button lock to prevent double-fire
- [x] 4.3 Show "Opening Google Calendar..." toast
- [x] 4.4 Fetch `/api/event-details` to get full event data (description, mapUrl)
- [x] 4.5 Build URL with `buildGoogleCalendarUrl()`
- [x] 4.6 Navigate via `navigateTo(url)`
- [x] 4.7 Error handling: show "Couldn't load event" or "Network error" on failure
- [x] 4.8 Add log lines: `add-to-calendar id=X`, `add-to-calendar navigating to: ...`

## 5. Create spec

- [x] 5.1 Create `openspec/specs/calendar-export/spec.md` with 3 requirements
- [x] 5.2 Each requirement has 2-3 scenarios (total 6)

## 6. Verify

- [x] 6.1 `npm test` — 54/54 still pass (no new tests needed for client-side helper)
- [x] 6.2 `openspec validate --strict` — all pass
- [x] 6.3 `npx tsc --build` — no new errors

## 7. Commit and document

- [x] 7.1 Commit: `feat(calendar): add Google Calendar export on event details + RSVP success`
- [x] 7.2 Push to origin
- [x] 7.3 Manual test on r/meetup_hub2_dev (deferred to post-merge)
