# e19 — Home Page Sort by Occurrence + Prev/Next Wrap-Around

**Priority:** 3/5
**Status:** implemented (shipped in v1.6.3, commit `a71feb6`)

## What Was Shipped

### D1: Sort Home Events by Occurrence Time
`flattenHomeEvents()` in `app.ts` now sorts the flattened array by `date` then `time` using `localeCompare`. Guarantees chronological order regardless of server state.
- `src/client/app.ts` — `flattenHomeEvents` L307-311

### D2: Wrap-Around Prev/Next Navigation
`updateCardNav()` now accepts a `wrap: boolean = false` parameter. When `wrap === true`, both prev/next buttons remain visible when `total > 1` (no clamping at boundaries). Home card calls with `wrap: true`. Mod dashboard and My Stuff use default `wrap: false`.
- `src/client/app.ts` — `updateCardNav` L231-232, `renderHomeCard` L408
2. **`updateCardNav()`** — add an optional `wrap` parameter. When `wrap=true`, both prev and next buttons are visible whenever `total > 1` (no boundary hiding). When `wrap=false` (default), the existing boundary-hiding behavior is preserved for my-stuff / mod-dashboard navigators.
3. **`renderHomeCard()`** — pass `wrap=true` to `updateCardNav` so the home card uses the new wrap-around UI.

## Out of Scope

- Changing the server's sort (it's already correct in `getActiveEvents` / `getAllApprovedEvents`)
- Wrap-around for My Stuff or mod-dashboard card navigation (those clamp by design)
- New search/filter UI (separate: `e10-search-filter-ui` is still `future`)
- Editing the wrap indicator visual (e.g., a small "↻" hint on the button) — out of scope for this change
