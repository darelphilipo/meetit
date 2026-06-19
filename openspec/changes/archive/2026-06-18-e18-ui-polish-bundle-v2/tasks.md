# Tasks — e18 UI Polish Bundle v2

## 1. Submit Event Wizard — 4 Cards Instead of 5

- [x] 1.1 In `public/app.html`, move `event-location` + `event-map-url` inputs from `event-step-3` INTO `event-step-2`, below the date/time `.form-row` as their own `.form-group`s
- [x] 1.2 Delete `event-step-3` div and `event-dot-3` from `app.html`
- [x] 1.3 Rename `event-step-4` → `event-step-3`, `event-dot-4` → `event-dot-3`, `event-step-5` → `event-step-4`, `event-dot-5` → `event-dot-4`
- [x] 1.4 Update the comment on `app.html` from "5 steps" to "4 steps"
- [x] 1.5 In `eventNext()` step 2 block, ADD location validation after date/time check
- [x] 1.6 In `eventNext()` step 3 block, REPLACE location check with description non-empty check + review-population code
- [x] 1.7 DELETE `eventNext()` line 1857-1877 (current step 4 block) entirely
- [x] 1.8 DELETE `eventPrev()` line 1817-1824 (current step 5 block) entirely
- [x] 1.9 Update `resetEventForm()` to use 4-step array
- [x] 1.10 Update `resetEventForm()` dot array to 4 dots
- [x] 1.11 Verify `submitEvent()` still works with unchanged element IDs

## 2. Description Textarea — Fill Card Vertically

- [x] 2.1 Add `style="display:flex; flex-direction:column;"` to `event-step-3` overlay-body
- [x] 2.2 Verify flex propagation to inner container
- [x] 2.3 Bump textarea `min-height:200px` → `min-height:280px`
- [x] 2.4 Manual verify: description card textarea fills remaining vertical space

## 3. Review-Your-Event — Explicit Previous/Next Pager

- [x] 3.1 Wire the desc pager in `eventNext()` step 3 review-population block
- [x] 3.2 Long desc (>100 chars): compute `dcKey = "review-" + Date.now()`, build pager using existing `buildModDescPagesHTML`/`buildModDescNavHTML`, repaginate after DOM paint
- [x] 3.3 Short desc (<100 chars): keep simple `textContent` (no pager)
- [x] 3.4 Fresh `dcKey` on re-navigation ensures no stale state
- [x] 3.5 Manual verify: long desc → see `← Previous` / `Next →` buttons that paginate
- [x] 3.6 Manual verify: edit desc, re-navigate to review → pager refreshes with new content
- [x] 3.7 Manual verify: short desc → no pager, just vertical scroll

## 4. Mod Dashboard Pending — Details Button + Days Overdue

- [x] 4.1 Add "Details" button as FIRST of 3 buttons in pending actions row (before Approve)
- [x] 4.2 Change row container to `flex-wrap:wrap` for narrow viewports
- [x] 4.3 Fix `showModEventDetails(id)` lookup to try `modItems["pending"]` first, then `modItems["published"]`
- [x] 4.4 Compute `daysOld` from `item.submittedAt`; render amber badge for 1 day, red for 2+
- [x] 4.5 Combine Days Overdue badge inline with category badge in flattened flex row
- [x] 4.6 Manual verify: pending event submitted 3 days ago → see "⏰ 3 days pending" + 3 buttons
- [x] 4.7 Manual verify: click "Details" on pending → 4-card mod detail overlay opens correctly

## 5. Mod Dashboard — Flatten Badge Row

- [x] 5.1 Build single `badges` string with category, days-pending, RSVP-count, past-event
- [x] 5.2 Wrap badges in ONE flex container: `display:flex; flex-wrap:wrap; gap:6px;`
- [x] 5.3 Remove individual margin-bottom from each badge
- [x] 5.4 Apply flat-row layout to all three mod tabs (pending, published, pitches)
- [x] 5.5 Manual verify: published event with category + 5 going → badges on one row

## 6. Mod Dashboard Pitches — Paginated Description In-Card

- [x] 6.1 Long pitch descs (>100 chars): compute `dcKey = "pitches-" + item.id`, paginate body using existing infrastructure
- [x] 6.2 Short descs (≤100 chars): keep simple 120-char snippet
- [x] 6.3 Manual verify: long pitch desc → see paginated body with `← Previous` / `Next →`

## 7. Mod Dashboard Tab State Sync Bug

- [x] 7.1 Reset `modTab = "pending"` and active tab class in `showModDashboard()`
- [x] 7.2 Add log: `showModDashboard resetting active class to pending (was ...)`
- [x] 7.3 Manual verify: open mod, switch tab, close, reopen → "Pending" tab is active
- [x] 7.4 Manual verify: same for "Pitches" tab

## 8. Home Card — Blinking Countdown Timer

- [x] 8.1 Add `@keyframes blinkPulse` + `.countdown-blink` class + `prefers-reduced-motion` media query in `app.html`
- [x] 8.2 Compute `hoursToGo` in `renderHomeCard()` from event date+time
- [x] 8.3 When `hoursToGo !== null`, render red blinking badge with "⏰ X hrs to go"
- [x] 8.4 When `hoursToGo === null`, keep regular relDate display
- [x] 8.5 Manual verify: event in <24h → see blinking red badge
- [x] 8.6 Manual verify: event in >24h → no countdown
- [x] 8.7 Manual verify: reduced-motion enabled → countdown visible but not blinking

## 9. Verify Who's Going Pager (Already Implemented)

- [x] 9.1 Confirm `ATTENDEES_PER_PAGE = 5` with prev/next buttons
- [x] 9.2 Confirm `att-prev` / `att-next` handlers call `slideTrack`
- [x] 9.3 Manual verify: 8 attendees → see "1/2" pager
- [x] 9.4 Document: pager hidden when total ≤ 1 page (by design)

## 10. Logging, Build, Verify

- [x] 10.1 Add `log()` calls at every changed path per LEARNINGS §0.2
- [x] 10.2 `npm run build` — passes
- [x] 10.3 `npm run type-check` — passes
- [x] 10.4 `npm test` — passes
- [x] 10.5 Manual smoke: complete submit-event flow, mod approve/decline, home countdown
- [x] 10.6 Commit as `a71feb6`, push as `v1.6.3`
- [x] 10.7 `openspec archive e18-ui-polish-bundle-v2` — pending (run after spec update)
