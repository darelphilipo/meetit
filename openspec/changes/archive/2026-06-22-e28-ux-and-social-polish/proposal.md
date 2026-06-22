# e28-ux-and-social-polish

**Priority:** 3/5

## Why

After several rounds of testing in `r/meetup_hub2_dev`, the user identified a cluster of UX/feature gaps that share the same theme: **make events more social, more discoverable, and better organized for the organizer and mod workflows.** None of these are showstoppers individually, but together they make the app feel more polished and turn a static event list into a community-discovery surface.

## What changes

Seven surgical fixes, each with a clear acceptance criterion:

| # | Issue | Fix location | Acceptance |
|---|-------|--------------|------------|
| 1 | Organizer not auto-RSVPed to their own event | `onApproveEvent` server-side | After approving an event, the organizer appears in the event's RSVP list and in their My Stuff → RSVPs |
| 2 | iPhone TIME box horizontally off in event form | CSS in `app.html` | DATE and TIME inputs render with equal width and aligned top/bottom on iOS Safari |
| 3 | My Stuff RSVP card: description clipped, Share button too big | `renderMyRsvpCard` client | 3 equal-width compact buttons in one row; description box gets more vertical space; share label is just "🎉 Share" |
| 4 | My Events card shows 0 attendees even when 2 are RSVPed | `onMySubmissions` server | The "👥 N Attendees" button on My Events card shows the correct count |
| 5 | Category badge at the bottom of the detail card | Detail card step 1 layout | Category badge is inline with the title (top right), not in its own row at the bottom |
| 6 | RSVP share post doesn't list other attendees | `buildRsvpShareBody` + `onRsvpShare` | "Also going (N): u/user1 u/user2 ..." section in the share post body, capped at 20 + "+N more" |
| 7 | Reminder post doesn't list who's going | `buildReminderBody` + `onCheckEvents` | "👥 N going: u/user1 u/user2 ..." section in reminder post body, capped at 20 + "+N more" |

A privacy disclosure update on the RSVP form also goes out (e28.8) to cover the new "your username may appear in public posts" implication of changes 6 and 7.

## Out of Scope

- **Auto-share on RSVP** (no user action) — would violate User Actions "no automated actions" rule.
- **Editing attendees list** after the fact (e.g., "remove me from this event's post") — different feature.
- **More than 20 attendees visible** in posts — current cap matches Reddit comment depth conventions; "+N more" covers the rest.
- **Server-side filtering of past events** from the My Events list — separate concern (e10/search filter UI is already in flight).
- **Editing the share post text** before posting — deferred to a follow-up if users ask for it.
- **CRON purge of past-event RSVP details** (e28.5) — already in the e28 plan as a separate sub-fix; deferred to a future change.

## Cross-cutting decisions

- **Cap = 20 attendees + "+N more"**: 20 is enough to demonstrate social proof without overwhelming a post. Matches Reddit comment-thread depth. If the cap is hit, posts show `u/user1 u/user2 ... +5 more` — standard "see all" pattern.
- **Sort = case-insensitive alphabetical**: more scannable than insertion order. A `Alice` and `alice` are deduped to one entry.
- **Organizer auto-RSVP zAdd is idempotent**: re-approving an already-RSVPed organizer is a no-op. No special handling needed.
- **My Events rsvpCount uses the existing rsvpScores batch query**: no extra Redis calls — we already had the data, just weren't using it for `myEvents`.
- **Share preview shows count, not the full list**: client-side lightweight (just the number from `cachedHomeEvents[i].rsvpCount`); server is source of truth for the actual list at submit time.
- **Disclosure update is a 1-line change**: existing disclosure at `app.html:512` already explains contact visibility; we just append a sentence about the new public-post behavior.

## Task list

See `tasks.md`.
