# e32-event-dm-notifications

**Priority:** 3/5 (deferred — not for v1.0)

**Status: proposed (deferred)**

This is a **documentation-only** change. No implementation work is planned for the v1.0 release. The proposal is retained for traceability and to inform future planning. The change can be promoted to an active implementation proposal when prioritized.

**Deferral reason (2026-06-27):** The v1.0 RC1 is feature-frozen and in the final pre-launch hardening phase. Adding three new DM flows (24h RSVP reminder, event approval, event dismissal) requires additional server logic, new dedup Redis keys, and new error-handling paths. While each individual flow is well-understood (the pattern is established in `onApproveIdea`), the cumulative blast radius — three new failure modes on the critical user path — is too much for a release that is otherwise ready to ship. The three flows will be reconsidered for v1.1 once RC1 is in production and real DM-failure data is available.

**When to implement:**
- After RC1 is in production for at least 1 week
- When real data on `reddit.sendPrivateMessage` failure rate is available to size the try/catch error handling
- When the mod dashboard UI for "dismiss with reason" prompt is planned (the dismissal DM needs a reason field; the UI to capture it is out of scope for this change)

## Why

The DM system is verified working (the "Your idea was received" and "Your Meetit pitch was approved!" screenshots from the dev subreddit confirm it). The app currently sends DMs in only one direction (mod → pitcher, on pitch approval) and one moment (pitch submission). Three DM touchpoints are missing that would meaningfully increase organizer and attendee engagement:

1. **24hr RSVP reminder** — when the CRON fires a 24h public reminder post, the people who RSVPed don't get a personal notification. They're far more likely to attend if their inbox pings them directly. The public post is great for community discovery; the DM is great for personal commitment.

2. **Event approval** — when a mod approves a submitted event, the submitter currently gets a public announcement post (added in `event-announcement-post`) but no personal confirmation. They have to check My Stuff to know if their event went live. A DM closes the loop: "your event is live, here's the announcement."

3. **Event dismissal** — when a mod deletes a pending event before approval, the submitter currently gets nothing. The pitch flow already has a "dismissed with reason" DM (via `buildApproveDm` / `onDismissIdea`); the event flow should mirror that.

All three DMs are **best-effort** — a DM failure never blocks the existing flow (approval, post creation, deletion). The pattern is already established in `onApproveIdea` (lines 875-893) — try/catch around `reddit.sendPrivateMessage`, log success and failure to `meetit:server_logs`, continue.

## Priority: 3/5

Standard engagement enhancement, user-requested. Not blocking, but the kind of "wow" touch that separates a finished product from a minimum viable one. **Implementation deferred — see header.**

## Scope

### New pure helpers in `src/shared/meetit.ts`

- `buildRsvpReminderDm(opts)` — 24h DM to RSVPed users
- `buildEventApprovedDm(opts)` — DM to event submitter on approval
- `buildEventDismissedDm(opts)` — DM to event submitter on mod deletion (optional reason)

All three follow the existing `buildApproveDm` pattern (return `{ subject, body }` from a pure function so they're testable without Redis/mocks).

### Server changes in `src/server/server.ts`

1. **24h reminder path** (find the CRON handler that fires the 24h public post): after the public post succeeds, iterate over the RSVPed users, call `buildRsvpReminderDm`, send via `reddit.sendPrivateMessage`, dedup via new Redis key `meetit:dm_reminded:${eventId}:${username}:24h` (25h TTL).
2. **`onApproveEvent`** (around line 1140): after the public announcement post succeeds, DM the submitter via `buildEventApprovedDm`. The submitter is the user who created the pending event (need to capture the `submittedBy` field when the event is created, OR fetch it from the pending event JSON before moving it).
3. **`onDeletePending`** (around line 898): if the deleter is a mod (not the owner), DM the submitter via `buildEventDismissedDm`. Accept an optional `reason` field in the request body. The DM is best-effort and doesn't block the deletion.

### New Redis keys

- `meetit:dm_reminded:${eventId}:${username}:24h` — String with 25h TTL — dedup for 24h RSVP reminder DM (one per user per event)

### New tests in `tools/meetit-behavior.test.ts`

- `buildRsvpReminderDm` — subject contains the event title, body includes organizer u/username, body includes the recipient u/username, body includes the "hope to see you there" line, body is deterministic
- `buildEventApprovedDm` — subject is "✅ Your event was approved!", body includes submitter u/username and event title
- `buildEventDismissedDm` — with reason, without reason, with empty reason — all three produce valid output

### Schema changes

- `MeetitEvent` (in `src/shared/api.ts`) needs a `submittedBy?: string` field to support the approval DM. This is a backward-compatible addition (optional). The existing pending events in production will have it missing; the code must fall back to `event.organizer` (which is the human-readable name, possibly the same as `submittedBy`) when `submittedBy` is missing.

## Out of scope (deferred)

- **2h reminder DM** — user only asked for 24h; the 2h DM is trivial to add later (same pattern, separate dedup key)
- **DM on published-event deletion by mod** — destructive action but rare; the organizer typically deletes their own events. If needed, it's a 5-line addition.
- **Mod dashboard UI for "dismiss with reason"** — server accepts the `reason` field; the UI can be updated in a follow-up to mirror the pitch flow's dismiss modal
- **DM notification preferences / opt-out** — the existing DMs (pitch received, pitch approved) don't have opt-out either; introducing opt-out for only the new DMs would be inconsistent. A unified "DM preferences" feature is a future enhancement.
- **Mod-alert DM** — already implemented in `server.ts:1472` for "N new item(s) await review"; not in scope

## Files affected

- `src/shared/meetit.ts` — 3 new pure helpers, ~60 lines
- `src/shared/api.ts` — add optional `submittedBy?: string` to `MeetitEvent`, 1 line
- `src/server/server.ts` — 3 call sites (24h reminder, approve, delete-pending), ~60 lines including logging
- `tools/meetit-behavior.test.ts` — ~6 new test cases

## Logging strategy

Each DM path emits a tagged log line so the in-app debug panel and `meetit:server_logs` zset catch regressions. Tags reuse the `FIX-NN`-style prefix convention.

| Tag | When | Fields |
|---|---|---|
| `[DM-RSVPT-24H]` | 24h DM sent to RSVPed user | `eventId`, `username`, `eventTitle` |
| `[DM-RSVPT-24H-FAIL]` | DM send failed (best-effort) | `eventId`, `username`, `error` |
| `[DM-RSVPT-24H-SKIP]` | DM dedup hit (already sent) | `eventId`, `username` |
| `[DM-RSVPT-24H-BATCH]` | DM batch started | `eventId`, `recipientCount` |
| `[DM-EVT-APPROVE]` | Event approval DM sent | `eventId`, `submitter`, `eventTitle` |
| `[DM-EVT-APPROVE-FAIL]` | Approval DM send failed | `eventId`, `submitter`, `error` |
| `[DM-EVT-DISMISS]` | Event dismissal DM sent | `eventId`, `submitter`, `hasReason` |
| `[DM-EVT-DISMISS-FAIL]` | Dismissal DM send failed | `eventId`, `submitter`, `error` |
| `[DM-EVT-DISMISS-SKIP]` | Deletion was self-action (owner deleted their own event), no DM | `eventId`, `actor` |

## Verification

- `npx tsc --build` — 0 new errors introduced (still 8 pre-existing)
- `npm test` — all 115 existing tests pass + 6 new tests pass = 121 total
- `npm run build` — succeeds
- `npx openspec validate e32-event-dm-notifications` — passes
- Manual playtest in the dev subreddit:
  - Submit an event 24h+ in the future, RSVP from a second account, advance the clock or trigger the CRON manually, confirm the second account gets a DM
  - Approve a pending event, confirm the submitter gets a DM
  - Delete a pending event as a mod, confirm the submitter gets a DM
  - Delete your own pending event, confirm you do NOT get a DM (self-action)

## Rollout

- Branch: `feat/e32-event-dm-notifications` (already created off `release/rc1`)
- One commit, atomic
- After merge into RC1 → tag as `v1.0.1-rc1` (or `v1.1.0-rc1` if we want to be semver-strict)
- Manual test before publishing to Reddit (the dev subreddit's CRON is what triggers the 24h DM)
