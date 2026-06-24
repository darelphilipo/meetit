# e31-calendar-export Tasks

## 1. Revert in-app e31 client-side changes

- [x] 1.1 Remove `buildGoogleCalendarUrl` helper from `app.ts`
- [x] 1.2 Remove the "📅 Add to Calendar" button from event details Card 2
- [x] 1.3 Remove the "📅 Add to Calendar" button from RSVP success card
- [x] 1.4 Remove the `case "add-to-calendar":` action handler

## 2. Add server-side buildGoogleCalendarUrl helper

- [x] 2.1 Add `buildGoogleCalendarUrl(event, timezone)` to `src/shared/meetit.ts`
- [x] 2.2 Default timezone to "+05:30" when not provided
- [x] 2.3 Return "" for missing or malformed date
- [x] 2.4 Convert local date+time to UTC for the `dates` parameter
- [x] 2.5 Default end time to start + 1 hour
- [x] 2.6 Append mapUrl to details when present

## 3. Add calendar link to buildReminderBody

- [x] 3.1 Insert `## 📅 [Add to Google Calendar](...)` section after the Maps section
- [x] 3.2 Omit section when calendarUrl is empty (missing/malformed date)

## 4. Add calendar link to buildRsvpShareBody

- [x] 4.1 Insert same section after the Maps section
- [x] 4.2 Omit section when calendarUrl is empty

## 5. Add unit tests

- [x] 5.1 Test buildGoogleCalendarUrl with full data (date + time + location + mapUrl)
- [x] 5.2 Test buildGoogleCalendarUrl with empty date
- [x] 5.3 Test buildGoogleCalendarUrl with malformed date
- [x] 5.4 Test buildGoogleCalendarUrl defaults time to 00:00
- [x] 5.5 Test buildGoogleCalendarUrl defaults timezone to +05:30
- [x] 5.6 Test buildGoogleCalendarUrl omits mapUrl when not provided
- [x] 5.7 Test buildGoogleCalendarUrl appends mapUrl when provided
- [x] 5.8 Test buildReminderBody includes calendar link after Maps
- [x] 5.9 Test buildReminderBody omits calendar link when date is missing
- [x] 5.10 Test buildRsvpShareBody includes calendar link after Maps
- [x] 5.11 Test buildRsvpShareBody omits calendar link when date is missing

## 6. Update spec

- [x] 6.1 Rewrite `openspec/specs/calendar-export/spec.md` to reflect the new approach (link in posts, not button)
- [x] 6.2 Add 3 requirements with 9 scenarios
- [x] 6.3 Rewrite `openspec/changes/e31-calendar-export/proposal.md` with the new approach and "what changed from the original plan" section

## 7. Verify

- [x] 7.1 `npm test` — 65/65 pass (11 new)
- [x] 7.2 `openspec validate --strict` — all pass
- [x] 7.3 `npx tsc --build` — no new errors

## 8. Commit and document

- [x] 8.1 Commit: `feat(calendar): add Google Calendar link to reminder + share posts`
- [x] 8.2 Push to origin
- [x] 8.3 Manual test on r/meetup_hub2_dev (deferred to post-merge)
