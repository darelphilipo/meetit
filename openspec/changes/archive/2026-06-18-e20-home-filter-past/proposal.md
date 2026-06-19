# e20 — Home Page: Filter Out Past Events

**Priority:** 2/5
**Status:** implemented (shipped in v1.6.3, commit `a71feb6`)

## What Was Shipped

After e19 added chronological sort, the user reported that past events sorted to the top (earlier time that day) and pushed real next events off the first slot. The user explicitly confirmed they want past events hidden from the home view entirely — not sorted to the end.

`flattenHomeEvents()` in `src/client/app.ts` now:
1. Sorts by (date, time) via e19's sort
2. Filters out events where `eventStart < Date.now()` (start time in the past)

The mod dashboard and My Stuff views are unaffected (they use different data pipelines).

### v2 attempt (reverted)
A v2 was attempted that sorted past events to the end of the list (ascending future, descending past). The user rejected this and requested a revert back to v1 (hide past events entirely). The current code is v1.
- `src/client/app.ts` — `flattenHomeEvents` L312-320
