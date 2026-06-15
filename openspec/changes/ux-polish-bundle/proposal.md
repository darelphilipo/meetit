## Why

Several UX polish items from the 2026-06-07 audit remain open. None are critical, but they add up to a noticeably smoother experience:

- **UX6:** Home shows one event at a time; no list view.
- **UX7:** Event details is a 4-step wizard; could be 2 steps.
- **UX8:** My Stuff shows one item at a time per tab.
- **UX9:** Mod dashboard shows one item at a time per tab.
- **UX11:** Search/filter UI hidden (covered by `e10-search-filter-ui` separately).
- **UX12:** Debug toggle overlaps content on small screens.
- **UX13:** No loading states for My Stuff tab switches.
- **UX14:** `approveEvent` / `deleteEvent` don't use `setBtnLoading`.
- **UX15:** Mod alerts create public posts (already fixed in v1.3.3 via modmail-only).

## Priority: 2/5

## Status: proposed (bundle)

## What Changes

- **UX12:** Move debug toggle to header (or add `padding-bottom: 60px` to main content on mobile).
- **UX13:** Show a small loading spinner or skeleton in My Stuff body when switching tabs.
- **UX14:** Refactor `approveEvent` and `deleteEvent` in `app.ts` to use `setBtnLoading`.

## Out of Scope (deferred)

- **UX6/7/8/9 (list views):** Major refactor; current single-card UI works well and is the established pattern. Out of scope for this bundle.
- **UX11:** Covered by `e10-search-filter-ui`.

## Capabilities

### New Capabilities
- `ux-polish-bundle`: Debug toggle positioning, My Stuff loading states, button-state consistency.

### Modified Capabilities
- None.

## Impact

- `public/app.html`: debug toggle repositioning, loading spinner styles.
- `src/client/app.ts`: `setBtnLoading` refactor in mod actions; My Stuff tab loading indicator.
