## Why

Pre-launch audit found 4 functional/correctness bugs and a type-contract drift that all need to ship before public release. Each bug has a real failure mode; combined, they would degrade trust in the app within the first week of use.

The four bugs validated against the code:

1. **Organizers can't see attendee contact details in-app** — `onRsvpList` strips email/phone for everyone except mods, but `onExportAttendees` correctly allows the event owner. The CSV download works; the in-app view does not. This breaks the organizer flow documented in the README.

2. **Users can RSVP to past events** — `onRsvp` only verifies the event exists in `meetit:active_events`. A stale Redis entry, a direct API call, or any client bypassing the UI can RSVP to an event whose date has passed. The fix has been spec'd (`fix-bug6-past-event-rsvp-block`) but never implemented; this change rolls it in.

3. **`npm run type-check` fails with 11 errors** — Build (esbuild) succeeds because it strips types, but `tsc --build` flags: missing `isMod` field in the `init` API response type, missing `approve-idea` and `cleanup-aged` variants in the API response union, and 5 same-scope variable redeclarations in `eventNext()` (step-3 form values shadow step-2 element references). All have a runtime safety net (defensive `typeof` checks, mutually-exclusive branches), but the type contract is drifting from the code.

4. **Clearing RSVP contact info doesn't actually clear** — `addRsvp` only writes `meetit:rsvp_details:{eventId}` when at least one of `email`/`phone` is present. A user who RSVPs with email+phone and later updates their RSVP with both fields blank leaves the old data in Redis, still visible to mods and exported via CSV.

**Regressions must be caught.** Each fix adds a server log line with a clear tag so the debug panel and the `meetit:server_logs` zset make regressions visible. Tags use the prefix `[FIX-NN]` so they're searchable.

## Priority: 4/5

These are correctness bugs that will erode user trust if they ship. The contact-details inconsistency is the highest-impact (organizers will notice in week 1). The past-event RSVP is a security concern (write to stale data). The type drift is maintainability (won't bite in week 1, will bite in month 3). All four must ship together because they share the same files and the same review pass.

## Status: proposed

## Scope

- `src/server/server.ts` — type union fixes, organizer check, past-event guard, hDel branch in addRsvp, new log lines
- `src/client/app.ts` — variable rename in `eventNext` step 3
- `src/shared/api.ts` — extend `ApiResponse` types (may not be needed if types live in server.ts)
- `tools/meetit-behavior.test.ts` — 4-6 new tests covering each fix

## Out of scope

- The 13 pre-existing `tsc` errors (unused vars, possibly-undefined) — separate change (`fix-tsc-errors-batch`)
- Renaming the Redis `meetit:` prefix (post-launch rebrand)
- Pre-existing CSV formula-injection guard (already shipped in v1.6.2)
- Rate limiting (separate `fix-sec2-rate-limiting` spec exists)

## Files affected

- `src/server/server.ts` (5 sites)
- `src/client/app.ts` (1 function, 5 var renames)
- `tools/meetit-behavior.test.ts` (new test cases)
- No HTML/CSS changes
- No Devvit config changes
- No new dependencies

## Logging strategy

Every fix emits a tagged log line. All log lines go to both `console.log` and the `meetit:server_logs` Redis zset (via `serverLog()`), so they appear in the in-app debug panel for mods.

| Tag | When | Fields |
|---|---|---|
| `[FIX-01]` | Contact details returned to requester | `eventId`, `requester`, `path` (`mod` \| `owner` \| `none`) |
| `[FIX-01-WARN]` | Non-mod non-owner attempted to view contact details | `eventId`, `requester`, `result=stripped` |
| `[FIX-02-BLOCK]` | Past-event RSVP blocked | `eventId`, `eventDate`, `username` |
| `[FIX-02-ALLOW]` | Future-event RSVP allowed (with explicit date check) | `eventId`, `eventDate`, `username` |
| `[FIX-04-CLEAR]` | Contact details cleared via hDel | `eventId`, `username` |
| `[FIX-04-WRITE]` | Contact details written (replacement path) | `eventId`, `username`, `hasEmail`, `hasPhone` |

Tag prefix `FIX-` distinguishes these from the existing `[FEATURE]`, `[BUG]`, `[MENU]`, `[RSVP]` tags so the debug panel can be filtered.

## Verification

- `npx tsc --build` — 0 errors
- `npm test` — all existing 110 tests pass + 4-6 new tests pass
- `npm run build` — produces `public/app.js` and `dist/server/index.js` without warnings
- `npx openspec validate fix-pre-launch-bugs` — passes

## Rollout

- Branch: `fix/pre-launch-bugs` off `release/rc1`
- One commit, atomic
- After merge: tag as `v1.0.1-rc1` (patch on top of RC1)
- Defer re-publish to Reddit until RC1 is approved
