# Tasks: e32-event-dm-notifications

## 1. Add `submittedBy` to `MeetitEvent` type

- [ ] 1.1 In `src/shared/api.ts`, add `submittedBy?: string;` to the `MeetitEvent` type (after `organizer?`)
- [ ] 1.2 In `src/server/server.ts` `createPendingEvent` (called from `onSubmitEvent` around line 460-470), capture `context.username` and pass it as `submittedBy` when the event is created
- [ ] 1.3 In `src/server/server.ts` `createPendingEvent` (in `src/shared/meetit.ts`), update the function signature to accept `submittedBy: string` and add it to the returned object
- [ ] 1.4 Verify: when an event is created, the pending event JSON in Redis has `submittedBy: "u/username"` (or just `"username"`, the format used in `context.username`)

## 2. Add `buildRsvpReminderDm` pure helper

- [ ] 2.1 In `src/shared/meetit.ts`, add a new function `buildRsvpReminderDm(opts: { eventTitle: string; eventDate: string; eventTime: string; recipientUsername: string; organizerUsername: string; meetitAppPostUrl?: string }): { subject: string; body: string }`
- [ ] 2.2 Subject format: `📅 Reminder: ${eventTitle} is tomorrow!`
- [ ] 2.3 Body format (mimics the user's exact wording, with typo fixes):
  ```
  Hi u/${recipientUsername},

  Quick reminder — the "${eventTitle}" event you RSVPd to is happening on ${eventDate} at ${eventTime}.

  📍 Contact u/${organizerUsername} (organizer) for any details.

  Hope to see you there! 🎉

  — Meetit
  ```
- [ ] 2.4 If `meetitAppPostUrl` is provided, append a line: `Open in app: ${meetitAppPostUrl}` before the `— Meetit` signature
- [ ] 2.5 Defensive: strip any `u/` prefix from `recipientUsername` and `organizerUsername` to avoid `u/u/username` rendering
- [ ] 2.6 Add the helper to the import list in `tools/meetit-behavior.test.ts`

## 3. Add `buildEventApprovedDm` pure helper

- [ ] 3.1 In `src/shared/meetit.ts`, add `buildEventApprovedDm(opts: { eventTitle: string; submitterUsername: string }): { subject: string; body: string }`
- [ ] 3.2 Subject: `✅ Your event "${eventTitle}" is live!`
- [ ] 3.3 Body:
  ```
  Hi u/${submitterUsername},

  Great news — your event "${eventTitle}" was approved by the mods and is now live for the community to see. 🎉

  People can now RSVP and the event will show up on the community's home page. We've also posted a public announcement.

  — Meetit Mods
  ```
- [ ] 3.4 Defensive: strip `u/` prefix from `submitterUsername`

## 4. Add `buildEventDismissedDm` pure helper

- [ ] 4.1 In `src/shared/meetit.ts`, add `buildEventDismissedDm(opts: { eventTitle: string; submitterUsername: string; reason?: string }): { subject: string; body: string }`
- [ ] 4.2 Subject: `❌ Your event wasn't approved`
- [ ] 4.3 Body (reason is optional; if missing, omit that line):
  ```
  Hi u/${submitterUsername},

  Your event "${eventTitle}" was reviewed and not approved by the mods.

  ${reason ? `Reason from the mod: ${reason}\n` : ""}
  Feel free to update and resubmit, or reach out to the mod team if you have questions.

  — Meetit Mods
  ```
- [ ] 4.4 Defensive: strip `u/` prefix from `submitterUsername`; if `reason` is empty string, treat as missing

## 5. Wire up 24h RSVP reminder DMs in the CRON

- [ ] 5.1 Locate the 24h reminder path in `src/server/server.ts` (search for `meetit:reminded:${eventId}:24h` to find the dedup key write site — this is where the public 24h post is created)
- [ ] 5.2 After the public 24h post is successfully created, fetch the RSVPed users via `redis.zRange(\`meetit:rsvps:${eventId}\`, 0, -1)`
- [ ] 5.3 For each RSVPed user, in a try/catch:
  - Check `meetit:dm_reminded:${eventId}:${username}:24h` — if exists, log `[DM-RSVPT-24H-SKIP]` and continue
  - Build the DM via `buildRsvpReminderDm`
  - Send via `reddit.sendPrivateMessage` with try/catch — success: log `[DM-RSVPT-24H]`; failure: log `[DM-RSVPT-24H-FAIL]` but continue with the rest
  - On success, write `meetit:dm_reminded:${eventId}:${username}:24h` with 25h TTL via `redis.set(key, "1", { expiration: new Date(Date.now() + 25 * 3600 * 1000) })` (or use the Devvit Redis API equivalent)
- [ ] 5.4 Emit a `[DM-RSVPT-24H-BATCH]` log line at the start with `eventId` and `recipientCount`
- [ ] 5.5 DM failures MUST NOT prevent the public 24h post from being created (best-effort)
- [ ] 5.6 If the event has no RSVPs, skip the batch entirely (log `[DM-RSVPT-24H-BATCH] recipients=0` and return)

## 6. Wire up event approval DM in `onApproveEvent`

- [ ] 6.1 In `src/server/server.ts` `onApproveEvent` (around line 1140), after the public announcement post is created successfully, fetch the submitter username
- [ ] 6.2 The submitter is `event.submittedBy` (added in step 1) — fall back to `event.organizer` if `submittedBy` is missing (legacy data)
- [ ] 6.3 If the submitter username is missing or empty, log a warning and skip the DM (don't crash)
- [ ] 6.4 Build the DM via `buildEventApprovedDm` and send via `reddit.sendPrivateMessage` in a try/catch
- [ ] 6.5 Log `[DM-EVT-APPROVE]` on success, `[DM-EVT-APPROVE-FAIL]` on failure (best-effort, doesn't block the approval)

## 7. Wire up event dismissal DM in `onDeletePending`

- [ ] 7.1 In `src/server/server.ts` `onDeletePending` (around line 898), add support for an optional `reason` field in the request body
- [ ] 7.2 After the auth check, determine if the actor is the event owner: `isOwner = isSubmissionOwner(context.username, event.organizer)`
- [ ] 7.3 If the actor is the owner (self-deletion), do NOT send a DM — log `[DM-EVT-DISMISS-SKIP] eventId=... actor=... reason=self`
- [ ] 7.4 If the actor is a mod (not the owner), fetch the submitter username (`event.submittedBy` or `event.organizer`)
- [ ] 7.5 If the submitter username is missing, log a warning and skip
- [ ] 7.6 Build the DM via `buildEventDismissedDm` (passing `reason` if provided) and send via `reddit.sendPrivateMessage` in a try/catch
- [ ] 7.7 Log `[DM-EVT-DISMISS]` on success, `[DM-EVT-DISMISS-FAIL]` on failure (best-effort, doesn't block the deletion)
- [ ] 7.8 IMPORTANT: the deletion must still succeed even if the DM fails

## 8. Tests

- [ ] 8.1 Test: `buildRsvpReminderDm` produces expected subject + body, strips `u/` prefix
- [ ] 8.2 Test: `buildRsvpReminderDm` is deterministic (same input → same output)
- [ ] 8.3 Test: `buildRsvpReminderDm` includes `meetitAppPostUrl` link line when provided
- [ ] 8.4 Test: `buildEventApprovedDm` produces expected subject + body
- [ ] 8.5 Test: `buildEventDismissedDm` includes reason when provided, omits when missing
- [ ] 8.6 Test: `buildEventDismissedDm` treats empty-string reason as missing

## 9. Final validation

- [ ] 9.1 `npx tsc --build` exits with 8 errors (the same 8 pre-existing from `fix-pre-launch-bugs`; no new errors)
- [ ] 9.2 `npm test` shows 115 + 6 = 121 tests passing
- [ ] 9.3 `npm run build` succeeds
- [ ] 9.4 `npx openspec validate e32-event-dm-notifications` passes
- [ ] 9.5 Manual playtest in dev subreddit: 24h RSVP DM, approval DM, mod-deletion DM all fire as expected
- [ ] 9.6 Manual playtest: self-deletion of a pending event does NOT send a DM to the deleter
