# e19 — Home Page Sort by Occurrence + Prev/Next Wrap-Around

**Priority:** 3/5

## Why

Two related home-page UX improvements:

1. **Sort events by occurrence time** — events on the home card should display in chronological order (soonest first). Currently the order is mostly correct (the server sorts, and the client flattens in date-sorted order) but it's not guaranteed across all data paths (e.g., when the cache is updated out-of-band, or when the search filter is applied). Adding an explicit client-side sort is a defensive change that guarantees the right order regardless of server state.

2. **Wrap-around prev/next navigation** — the home card's "← Prev" / "Next →" buttons should wrap: pressing Next on the last event should go to the first, and Prev on the first should go to the last. The modulo math is already implemented in `homePrev`/`homeNext`, BUT `updateCardNav` hides the buttons at the boundaries — so the user can never trigger the wrap. This change makes both buttons visible when there are 2+ events.

## What Changes

1. **`flattenHomeEvents()`** — sort the flattened array by `date` then `time` so the home card always displays events in chronological order, regardless of server state or filter state.
2. **`updateCardNav()`** — add an optional `wrap` parameter. When `wrap=true`, both prev and next buttons are visible whenever `total > 1` (no boundary hiding). When `wrap=false` (default), the existing boundary-hiding behavior is preserved for my-stuff / mod-dashboard navigators.
3. **`renderHomeCard()`** — pass `wrap=true` to `updateCardNav` so the home card uses the new wrap-around UI.

## Out of Scope

- Changing the server's sort (it's already correct in `getActiveEvents` / `getAllApprovedEvents`)
- Wrap-around for My Stuff or mod-dashboard card navigation (those clamp by design)
- New search/filter UI (separate: `e10-search-filter-ui` is still `future`)
- Editing the wrap indicator visual (e.g., a small "↻" hint on the button) — out of scope for this change
