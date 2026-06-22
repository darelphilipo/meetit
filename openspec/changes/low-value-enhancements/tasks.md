# low-value-enhancements Tasks

**Status:** Documentation-only. No implementation work planned.

This file exists for traceability. Each task below can be promoted to an active change proposal if/when prioritized.

## 1. "Next: [title]" toast after mod action

- [ ] 1.1 Decide whether to ship (current recommendation: skip — low value)
- [ ] 1.2 If shipping: extend `showToast()` in `app.ts` to accept an optional `nextTitle` arg
- [ ] 1.3 Wire into `approveEvent`, `deleteEvent`, `dismissIdea` after the splice
- [ ] 1.4 Test on r/meetup_hub2_dev

## 2. My Stuff index preservation across refresh

- [ ] 2.1 Decide whether to ship (current recommendation: skip — edge case, complex)
- [ ] 2.2 If shipping: track viewed event by ID (add `viewedMyStuffId` state)
- [ ] 2.3 In `loadMySubmissions()`, after data load, find the new index of `viewedMyStuffId`
- [ ] 2.4 Fall back to clamped index if `viewedMyStuffId` was deleted
- [ ] 2.5 Add unit test for "viewed event deleted server-side" case

## 3. Navigation returnTo / stack

- [ ] 3.1 Decide whether to ship (current recommendation: skip — high risk)
- [ ] 3.2 If shipping: introduce `screenHistory: string[]` stack
- [ ] 3.3 Update `openOverlay()` to push to history; `closeOverlay()` to pop
- [ ] 3.4 Make `resetEventForm()` conditional (only when event-overlay closes)
- [ ] 3.5 Audit 40+ call sites of `closeOverlay()` for correct return behavior
- [ ] 3.6 Add `navigateBack()` function for the universal "back" button

## 4. Mod dashboard list view

- [ ] 4.1 Decide whether to ship (current recommendation: skip — feature request, no current demand)
- [ ] 4.2 If shipping: add `modViewMode: "card" | "list"` state
- [ ] 4.3 Add a toggle button in the mod dashboard header
- [ ] 4.4 Build `renderModPendingList()`, `renderModPublishedList()`, `renderModPitchesList()`
- [ ] 4.5 List view shows: emoji + title + date + status badge, one row per event
- [ ] 4.6 Tapping a row in list view opens the same detail overlay as tapping Details on a card

## 5. Event discovery pagination

- [ ] 5.1 Decide whether to ship (current recommendation: skip — feature request, no current demand)
- [ ] 5.2 If shipping: add "3 / 27" page counter to home card carousel
- [ ] 5.3 OR add a list view option (similar to item 4)
- [ ] 5.4 Test with 20+ events on r/meetup_hub2_dev

## 6. Deep linking

- [ ] 6.1 Decide whether to ship (current recommendation: skip — feature request, no current demand)
- [ ] 6.2 **Requires item 3 (navigation stack) as foundation**
- [ ] 6.3 Research Devvit URL handling (`navigateTo` with query params?)
- [ ] 6.4 Design URL scheme: `?screen=event&id=abc123`, `?screen=mod&tab=pending`
- [ ] 6.5 Implement parser that restores state on app boot
- [ ] 6.6 Test all entry points (Reddit feed, comments, custom post)

## Logging & Polish

- [ ] 7.1 If any item is implemented: add `log()` calls at every changed path per LEARNINGS §0.2
- [ ] 7.2 Run `npm test`, `tsc --build`, `openspec validate --strict`
- [ ] 7.3 Commit, push, create OpenSpec archive
