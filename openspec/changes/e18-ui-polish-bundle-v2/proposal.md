# e18 — UI Polish Bundle v2 (Card Layout, Tab Sync, Countdown)

**Priority:** 2/5

## Why

A second round of UI polish based on direct user feedback. All items are non-critical — the app is working. Items are bundled because they share the same release (UI cleanup, v1.6.3) and several touch the same render functions (`renderModCard`, `renderHomeCard`, submit-event wizard navigation).

## What Changes

1. **Submit event wizard — 4 cards instead of 5.** Merge the Location + Google Maps step into the Date + Time step. Renumber 5→4.
2. **Description input — fill the full card vertically.** Make the parent step flex-column so the textarea's `flex:1` actually has something to flex against.
3. **Review-your-event card — explicit Previous/Next pager buttons** for the description (CSS-only tricks have failed 3 times across v1.5.5/v1.5.6/v1.6.1).
4. **Mod dashboard pending card — add Details button + Days Overdue badge.** Details reuses `showModEventDetails()`. Days Overdue = `Math.floor((Date.now() - new Date(item.submittedAt)) / 86400000)`.
5. **Mod dashboard published card — flatten badge row** (Category + "2 going" + "Past Event" on one line via flex container with gap).
6. **Mod dashboard pitches card — paginated description in the in-card body** using the existing `buildModDescPagesHTML` + `buildModDescNavHTML` infrastructure.
7. **Mod dashboard tab state sync bug** — `showModDashboard()` now resets the active tab class to "pending" on re-open, fixing the "yellow highlight on wrong tab" bug.
8. **Home card — blinking countdown for events in the next 24 hours.** New `hoursToGo` calculation + `@keyframes blinkPulse` + `.countdown-blink` class. Honors `prefers-reduced-motion`.

### Already implemented (verified, no change)

- **Who's Going page horizontal pager** is already implemented (`ATTENDEES_PER_PAGE = 5`, `buildAttNav`, prev/next buttons). Pager is hidden when total ≤ 1 page. **This is correct** — the user will see the pager once an event has 5+ attendees.

## Out of Scope

- Removing `.pending-card` dead CSS class (mention only, don't delete)
- Submit event form validation re-architecture
- New translation/i18n for the countdown
- Backend changes (no API changes)
- Search/filter UI (separate: `e10-search-filter-ui` is still `future`)
- Move debug toggle (separate: `ux-polish-bundle` is still `partial`)
- Approve/decline flow changes (only adding a third Details button)
