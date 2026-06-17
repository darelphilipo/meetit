## Why

The `filterHomeEvents()` function in the client already implements search and category filter logic, but the UI is commented out (LEARNINGS §39.3 / BUG_REGISTRY U20, now in `docs/archive/`). The community is small today, but when the events list grows past ~10, search and filter become necessary. The code is already written — re-enabling the UI is mostly uncommenting and a small CSS addition.

## Priority: 1/5

## Status: future (low priority until events list > ~10)

## Audit (2026-06-17)

**Code state confirmed.** `filterHomeEvents()` is defined and functional at `app.ts:372-396` — it filters `cachedHomeEvents` by title/location/date/time and stores results in `searchFilteredEvents`, which is read by `homePrev()`/`homeNext()`. However, the search input UI listener is **commented out** at `app.ts:2155-2161` (`"Search input listener (disabled — feature kept for future use)"`). No search bar, category pills, or toggle button exists in the HTML. All 42 tasks in tasks.md remain **not implemented** — they are the UI work. The filter function was already created as part of the original codebase, not these tasks.

**No urgency change.** Community still has <20 events. Status stays "future" — implement when events > ~30.

## What Changes

- Uncomment the search input and category filter UI in the home screen.
- Re-enable the `filterHomeEvents()` invocation on input change.
- Add a small "🔍 Search" toggle button in the home screen header that expands/collapses the search bar (so it doesn't take permanent header space on mobile).
- Category filter: a horizontal scrollable pill row below the search bar with one pill per category (`CATEGORY_EMOJI` from shared) plus an "All" pill.
- On mobile, the search bar and category pills are hidden by default; tapping the 🔍 toggle reveals them above the card shell.

## Capabilities

### New Capabilities
- `search-filter-ui`: Search input and category filter pills on the home screen, with a toggle to keep the mobile header compact.

### Modified Capabilities
- None.

## Impact

- `src/client/app.ts`: uncomment `filterHomeEvents` listener, add category pill state, add toggle.
- `public/app.html`: add search bar and category pill row; add `🔍` toggle in header.

## When to Implement

- **Now** if the community hits 10+ events.
- **Later** otherwise. The cost of doing it now is small (code is mostly there), but the value is also small until the list grows.

## Why Still Track It

- The `filterHomeEvents()` function is already in the codebase but unused; the moment it's needed, having a spec to refer to means faster turnaround.
- A future implementer can pick this up without re-deriving the design.
