## 1. Shared: buildAnnouncementTitle helper

- [ ] 1.1 In `src/shared/meetit.ts`, add a new pure helper `buildAnnouncementTitle(event, location?): string`. The function takes an event-like object with at least `{ title: string, date: string }` and an optional `location: string`.
- [ ] 1.2 Title format: `📅 [New Meetup] ${title} — ${date}${location ? " @ " + location.trim() : ""}`. If `location` is empty/whitespace, omit the ` @ {location}` suffix. If `title` or `date` is missing, fall back to "New Meetup" / "TBD" respectively (defensive).
- [ ] 1.3 Pure function — no Devvit imports, no I/O. Testable with simple equality assertions. Returns the same output for the same input.

## 2. Server: onApproveEvent creates the announcement post

- [ ] 2.1 In `src/server/server.ts` `onApproveEvent` (the function that moves an event from pending to active), AFTER the existing state change (`hSet active_events` + `hDel pending_events`) and AFTER the existing auto-RSVP organizer block, and BEFORE the `return { type: "approve-event", success: true }`:
  1. Build the title with `buildAnnouncementTitle(event)`.
  2. Build the body with `buildReminderBody(event, organizer-or-fallback, modList, [], context.subredditName, meetitAppPostUrl)`. Note: `attendees` is `[]` (no one has RSVPed yet on approval). The body still has the full event details + "Open in Meetit to RSVP" link.
  3. `const post = await reddit.submitPost({ title, text: body })`. No `runAs` — posts as the app account (same pattern as CRON reminder posts).
  4. `await redis.set("meetit:event_post:" + eventId, post.url)`. Stores the post URL for future reference.
  5. Log `[APPROVE] announcement post created url={post.url} for {event.title}`. Also `serverLog("info", ...)`.
- [ ] 2.2 Wrap the post creation in a try/catch so a Reddit API failure doesn't break the approval. Log the error with `[APPROVE] announcement post FAILED for {eventId}: {err}` and continue. The event is still approved; the announcement is a courtesy.

## 3. Tests

- [ ] 3.1 In `tools/meetit-behavior.test.ts`, add tests for `buildAnnouncementTitle`:
  - With title + date + location → produces "📅 [New Meetup] X — 2026-06-21 @ Cubbon Park"
  - With title + date, no location → produces "📅 [New Meetup] X — 2026-06-21"
  - With empty title → falls back to "New Meetup"
  - With empty date → falls back to "TBD"
  - With whitespace-only location → omits the `@` suffix

## 4. Verification

- [ ] 4.1 `npm test` — 105/105 still pass + 3-4 new = 108-109 total.
- [ ] 4.2 `npx openspec validate --all` — passes (47 → 48).
- [ ] 4.3 Manual playtest (2 devices):
  - Device 1 (submitter): submit a pending event with all fields filled
  - Device 2 (mod): open Mod Dashboard → Pending → click "Approve & Publish"
  - Server: post the event to active, RSVP organizer, post announcement
  - **Verify**: a new public post appears on r/{subreddit} with title "📅 [New Meetup] {title} — {date} @ {location}" and the full event body
  - **Verify**: `meetit:event_post:${eventId}` is set in Redis
  - **Verify**: server log shows `[APPROVE] announcement post created url=...`
  - Click the post URL → see the body rendered (date, time, location, map, calendar, description, organizer, RSVP link)
- [ ] 4.4 Add Test 8 to `TEST_CASES.md` results table.
