## 1. Client: add the button to My Stuff published events

- [x] 1.1 In `renderMyEventCard()`, locate the published-events branch (`status === "published"`)
- [x] 1.2 After the existing action buttons (Delete), append a `<button>` with:
  - `class="btn btn-white btn-sm"`
  - `data-id="{event.id}"`
  - `data-action="view-attendees-organizer"`
  - `style="width:100%;padding:8px;font-size:12px;"`
  - Label: "👥 {rsvpCount} Attendee{s}" (with s only when rsvpCount !== 1)
- [x] 1.3 Log on render: `log("my-event attendees-button id=" + event.id + " rsvpCount=" + (event.rsvpCount||0))`

## 2. Client: wire the action handler

- [x] 2.1 In `handleAction()`, add `case "view-attendees-organizer":`
- [x] 2.2 Read `id` from the clicked element's `data-id`
- [x] 2.3 If `id` is empty, log warning and return
- [x] 2.4 Call the existing `showModAttendees(id)` function (verify it is the correct entry point and that it does the right auth check server-side; if it does not, call `/api/export-attendees` directly)
- [x] 2.5 Log: `log("view-attendees-organizer eventId=" + id + " rsvpCount=" + (currentCount||0))`

## 3. Server: verify and (if needed) extend the existing endpoint

- [x] 3.1 Read `onExportAttendees` in `server.ts`. Confirm it does `isSubmissionOwner(context.username, event.organizer)` check (organizer OR mod).
- [x] 3.2 If the existing endpoint is mod-only, extend it to also allow the organizer. If it already allows the organizer, no server change is needed — document this in the PR description.

## 4. Logging & Polish

- [x] 4.1 Add `log()` calls at every changed path per §0.2
- [x] 4.2 Verify the debug panel shows the log on every render + tap
- [x] 4.3 Manual test: log in as organizer A who owns event X; verify the button shows the correct count; tap it; verify the attendee list loads. Repeat as a non-owner to confirm the button is not shown.
- [x] 4.4 Run `npm run build`, `npm test`, `npm run type-check`, `npm run lint`
- [x] 4.5 Commit, push, create OpenSpec archive
