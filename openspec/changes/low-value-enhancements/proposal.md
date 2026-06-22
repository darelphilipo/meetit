# low-value-enhancements

**Priority:** 5/5 (very low — deferred to v2+)

## Why

A UX audit on 2026-06-22 identified 6 polish items that improve the experience but are not critical to app stability or core user flows. All 6 are explicitly deferred to future state to protect the stability of the current app. This proposal captures them for traceability and to inform future planning — none of these items will be implemented in the current version.

The high-value subset (1a: My Stuff skip-after-delete and 1b: Mod queue reset-to-0) was shipped separately as the `fix-card-index-fidelity` direct commit, since they are bug fixes rather than enhancements.

## Status: proposed (deferred)

This is a **documentation-only** proposal. No implementation work is planned. Each item below can be promoted to an active change proposal if/when prioritized.

## Items

### 1. "Next: [title]" toast after mod action
- **Source:** UX finding 1c (2026-06-22 audit)
- **Why deferred:** Low perceived value. The mod can already see the next card (the action toast confirms what happened, the card is rendered immediately after, and card dots show position). The only edge case it helps is rapid review of similarly-titled events, which is rare.
- **Effort if implemented:** Small (~10 lines + toast config)
- **Risk:** Low

### 2. My Stuff index preservation across refresh
- **Source:** UX finding 2a (2026-06-22 audit)
- **Why deferred:** Edge case. The `visibilitychange` handler calls `loadMySubmissions()` which resets all three indexes (`myRsvpIdx`, `myPitchIdx`, `myEventIdx`) to 0. Users do background/foreground rarely; when they do, the reset is acceptable. Complex to implement correctly: must track viewed event by ID (not index) and resolve to new index after refresh, with fallback if the viewed event was deleted server-side.
- **Effort if implemented:** Medium (requires ID-tracking refactor + edge-case tests)
- **Risk:** Medium (could confuse users if data has changed)

### 3. Navigation returnTo / stack
- **Source:** UX finding 2b (2026-06-22 audit)
- **Why deferred:** High risk. Architectural change. `closeOverlay()` is called 40+ times in the codebase; every close button would need to think about where to go. `resetEventForm()` side effect in `closeOverlay()` would need to be conditional. The current "everything goes to Home" pattern is predictable and users have adapted.
- **Effort if implemented:** Large (architectural refactor)
- **Risk:** High (touches a stable system)
- **Note:** Could be revisited when adding deep linking (item 6) since both require the same foundation.

### 4. Mod dashboard list view
- **Source:** UX finding 3a (2026-06-22 audit)
- **Why deferred:** Feature request, no current demand. Card-based browsing works for 2-5 pending events which covers the current mod workload. List view would be valuable only at 10+ pending events, which is uncommon.
- **Effort if implemented:** Medium (new view mode + toggle UI + new render path)
- **Risk:** Low–medium (additive, doesn't replace card view)

### 5. Event discovery pagination
- **Source:** UX finding 3b (2026-06-22 audit)
- **Why deferred:** Feature request, no current demand. Home card carousel works for 5-10 events which covers the current usage. Pagination would be valuable only at 20+ published events.
- **Effort if implemented:** Medium (page counter + scroll or list view)
- **Risk:** Low

### 6. Deep linking
- **Source:** UX finding 3c (2026-06-22 audit)
- **Why deferred:** Feature request, no current demand. No URL-based navigation exists; everything is in-app overlay navigation. Would require a navigation stack (see item 3) plus Devvit URL handling.
- **Effort if implemented:** Large (requires item 3 foundation + Devvit URL handling)
- **Risk:** Medium (changes how the app boots)

## Out of Scope (always)

- All 6 items are deferred to v2+. Documented here for traceability only.
- The high-value bug fixes (1a: My Stuff skip-after-delete, 1b: Mod queue reset-to-0) were shipped separately as direct commits and are NOT part of this proposal.

## Cross-cutting decisions

- **Each item is independent.** Can be implemented standalone OR as part of a future bundle.
- **No new dependencies** required for any item.
- **No server changes** required for items 1, 2.
- **Items 3, 4, 5 are client-only.**
- **Item 6 requires item 3** as a foundation.
- **Items 1, 2 can ship as a small bundle** if/when prioritized (similar size to the 1a+1b fix that was shipped).
- **Items 4, 5, 6 are larger features** requiring design discussion before implementation.

## Capabilities

### New Capabilities
- `low-value-enhancements`: Deferred UX polish items, documented for future planning.

### Modified Capabilities
- None.

## Impact

- No code changes. This is a documentation-only proposal.
- Future implementations would touch:
  - `src/client/app.ts` (all items)
  - `openspec/specs/mod-dashboard/spec.md` (items 4)
  - `openspec/specs/my-stuff-card/spec.md` (items 2)
  - `openspec/specs/navigation-stack/spec.md` (new spec, items 3, 6)
  - `openspec/specs/home-page/spec.md` (item 5)
