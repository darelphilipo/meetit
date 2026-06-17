# e20 — Home Page: Filter Out Past Events

**Priority:** 2/5

## Why

After e19 added chronological sort, the user reported a confusing home view: an event for "today 18-06" (already past) shows first, then an event with "<1 hr to go" shows second. The sort itself is correct — the past event happened earlier in the day, so it sorts first. But the home view shouldn't show events that have already started. They're confusing for users (look "upcoming" but aren't) and they push the real next event (the < 1 hr one) off the first slot.

`getActiveEvents` (server, `server.ts:226-234`) already filters events whose **date** is in the past, but not events whose **start time** is in the past. So an event at 14:00 today still appears at 15:00, 18:00, 23:00, etc.

## What Changes

`flattenHomeEvents()` filters the sorted flat array to remove events whose start time is in the past. Past events are hidden from the home view entirely. The mod dashboard (which uses `getAllApprovedEvents`, not `getActiveEvents`) is unaffected.

## Out of Scope

- Server-side filter in `getActiveEvents` (the client-side filter is the immediate fix; server change can be a follow-up)
- Showing a "Started" or "In progress" label for events that just started (could be added later)
- Filtering past events from the mod dashboard or my-stuff views (those have different semantics)
- Showing past events at the end of the list (user confirmed they should not appear on the home at all)
