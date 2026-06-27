# Tasks: fix-pre-launch-bugs

## 1. Fix organizer can see attendee contact details (FIX-01)

- [ ] 1.1 In `src/server/server.ts` `onRsvpList`, after `await isMod()`, fetch the event JSON from `meetit:active_events` and compute `isOwner = isSubmissionOwner(context.username, event.organizer)`
- [ ] 1.2 Change `canViewContactDetails` to: `Boolean(includeContactDetails) && (await isMod() || isOwner)`
- [ ] 1.3 Add `[FIX-01]` log line: `console.log + serverLog("info", \`[FIX-01] rsvp-list eventId={id} requester={user} path={mod|owner|none} count={n}\`)`
- [ ] 1.4 Add `[FIX-01-WARN]` log line when `includeContactDetails=true` and requester is neither mod nor owner: `serverLog("warn", \`[FIX-01-WARN] rsvp-list eventId={id} requester={user} contact-stripped path=none\`)`
- [ ] 1.5 Verify: as event organizer (not mod), `/api/rsvp-list` with `includeContactDetails: true` returns attendees WITH email/phone fields populated
- [ ] 1.6 Verify: as random non-mod non-owner, `/api/rsvp-list` with `includeContactDetails: true` returns attendees WITHOUT email/phone fields (stripped, with WARN log)

## 2. Block RSVP to past events (FIX-02)

- [ ] 2.1 In `src/server/server.ts` `onRsvp`, after `getActiveEvent`, compare `event.date` to today's date in the event's timezone
- [ ] 2.2 If `event.date < today`, return `{ error: "Cannot RSVP to past events", status: 400 }` and emit `[FIX-02-BLOCK]` log
- [ ] 2.3 If `event.date >= today`, proceed with existing RSVP flow and emit `[FIX-02-ALLOW]` log
- [ ] 2.4 Add helper `isEventPast(event: MeetitEvent, tz: string): boolean` in `src/shared/meetit.ts` for testability
- [ ] 2.5 Edge case: events with `event.date === today` (today's events) MUST be RSVPable
- [ ] 2.6 Edge case: events with `event.date` empty/malformed MUST default to "not past" (allow) so we don't silently block due to bad data; log a warning

## 3. Fix `npm run type-check` errors (FIX-03)

### 3.1 Add `isMod` to `init` type

- [ ] 3.1.1 In `src/server/server.ts` line 180, change `{ type: "init"; postId: string; username: string; settings: AppSettings; timezone: string }` to add `isMod: boolean` before the closing brace
- [ ] 3.1.2 Verify: `tsc --build` no longer reports the `server.ts(357,5)` error

### 3.2 Add `approve-idea` to API response union

- [ ] 3.2.1 In `src/server/server.ts` `ApiResponse` union (line 179-200), add `| { type: "approve-idea"; success: boolean }` after the `dismiss-idea` variant
- [ ] 3.2.2 Add `| { type: "cleanup-aged"; deleted: { events: number; pitches: number }; thresholdDays: number; paused: boolean }` (or whatever the actual return shape is) for the cleanup-aged handler
- [ ] 3.2.3 Verify: `tsc --build` no longer reports the `server.ts(865,14)` and `server.ts(895,12)` errors

### 3.3 Rename step-3 variables in `eventNext` to avoid redeclaration

- [ ] 3.3.1 In `src/client/app.ts` lines 2563-2568, rename the 5 step-3 vars: `titleEl` → `titleVal`, `dateEl` → `dateVal`, `timeEl` → `timeVal`, `locEl` → `locVal`, `catEl` → `catVal`
- [ ] 3.3.2 Verify: `tsc --build` no longer reports the 6 `app.ts(2563-2569)` errors

## 4. Clear contact info when RSVP is updated with blank fields (FIX-04)

- [ ] 4.1 In `src/server/server.ts` `addRsvp`, invert the `if (email || phone)` branch: keep the write, add an `else` that calls `redis.hDel(\`meetit:rsvp_details:${eventId}\`, [userKey])`
- [ ] 4.2 Add `[FIX-04-CLEAR]` log when hDel runs: `serverLog("info", \`[FIX-04-CLEAR] rsvp-details cleared eventId={id} user={user}\`)`
- [ ] 4.3 Add `[FIX-04-WRITE]` log when hSet runs: `serverLog("info", \`[FIX-04-WRITE] rsvp-details written eventId={id} user={user} hasEmail={bool} hasPhone={bool}\`)`
- [ ] 4.4 Verify: an RSVP update with both email and phone blank causes the user's entry to be removed from `meetit:rsvp_details:{eventId}` (not just left as-is)

## 5. Tests

- [ ] 5.1 New test: `onRsvpList` allows event owner (non-mod) to see contact details
- [ ] 5.2 New test: `onRsvpList` strips contact details for non-mod non-owner (with WARN log emission)
- [ ] 5.3 New test: `isEventPast` returns true for yesterday, false for today, false for tomorrow
- [ ] 5.4 New test: `isEventPast` returns false for malformed date (defensive default)
- [ ] 5.5 New test: `addRsvp` with blank email AND blank phone calls `hDel` (not `hSet`)

## 6. Final validation

- [ ] 6.1 `npx tsc --build` exits with 0 errors
- [ ] 6.2 `npm test` shows 110+N tests passing (N = 5 new tests minimum)
- [ ] 6.3 `npm run build` produces `public/app.js` and `dist/server/index.js` (esbuild succeeds, no missing-import warnings)
- [ ] 6.4 `npx openspec validate fix-pre-launch-bugs` passes
- [ ] 6.5 Grep verification: `grep -rn "meetit:" public/app.js` shows the namespaced keys (sanity)
- [ ] 6.6 Manual playtest: in the dev subreddit, as an organizer, click "View Attendees" on your own event and confirm you see contact details
- [ ] 6.7 Manual playtest: try to RSVP to an event with yesterday's date via direct API call, confirm 400 response
- [ ] 6.8 Manual playtest: update your RSVP with blank email/phone, confirm the contact info is removed (check via mod view or export)
