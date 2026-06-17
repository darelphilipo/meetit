# Tasks — e18 UI Polish Bundle v2

## 1. Submit Event Wizard — 4 Cards Instead of 5

- [ ] 1.1 In `public/app.html`, move `event-location` + `event-map-url` inputs from `event-step-3` (lines 407-410) INTO `event-step-2` (lines 401-406), below the date/time `.form-row` as their own `.form-group`s
- [ ] 1.2 Delete `event-step-3` div and `event-dot-3` from `app.html`
- [ ] 1.3 Rename `event-step-4` → `event-step-3` (lines 411-416), `event-dot-4` → `event-dot-3` (line 377), `event-step-5` → `event-step-4` (lines 417-425), `event-dot-5` → `event-dot-4` (line 378)
- [ ] 1.4 Update the comment on `app.html:370` from "5 steps" to "4 steps"
- [ ] 1.5 In `src/client/app.ts` `eventNext()` (line 1840-1848, step 2 block), ADD location validation after the date/time check: read `event-location` and require non-empty with toast "Location required"
- [ ] 1.6 In `eventNext()` line 1849-1856 (current step 3 block, validates location only): REPLACE the location check with a description non-empty check (`var desc = ...; if (!desc) { showToast("Add a description", "error"); return; }`). Add the review-population code from current lines 1867-1876 (setting `event-review-title-preview`, `event-review-meta-preview`, `event-review-desc-preview` textContent, hiding the next button, showing the submit button) at the end of this block
- [ ] 1.7 DELETE `eventNext()` line 1857-1877 (current step 4 block) entirely — its logic moved to the new step 3 block in task 1.6
- [ ] 1.8 DELETE `eventPrev()` line 1817-1824 (current step 5 block) — no more step 5 to go back from
- [ ] 1.9 Update `resetEventForm()` line 1791 to use 4-step array: `["event-step-1", "event-step-2", "event-step-3", "event-step-4"]`
- [ ] 1.10 Update `resetEventForm()` line 1795 to use 4-step dot array: `["event-dot-1", "event-dot-2", "event-dot-3", "event-dot-4"]`
- [ ] 1.11 Verify `submitEvent()` (line 1880) still works: confirm `event-location` and `event-map-url` ids are unchanged so `getElementById` still works

## 2. Description Textarea — Fill Card Vertically

- [ ] 2.1 In `public/app.html` on `event-step-3` (new id after #1.3), add `style="display:flex; flex-direction:column;"` to the `.overlay-body` div
- [ ] 2.2 In the same `event-step-3` form-group, the existing `flex:1; min-height:0; display:flex; flex-direction:column;` is already on the inner div — verify it propagates
- [ ] 2.3 Bump textarea `min-height:200px` → `min-height:280px` so first paint shows a taller box
- [ ] 2.4 Manual verify: open submit form, navigate to description card → textarea fills remaining vertical space above the wizard footer

## 3. Review-Your-Event — Explicit Previous/Next Pager

- [ ] 3.1 In `src/client/app.ts` `eventNext()` step 3 block (the new combined validate-desc + populate-review block per task 1.6), find the line that sets `(document.getElementById("event-review-desc-preview") as HTMLElement).textContent = desc;` (currently around line 1870)
- [ ] 3.2 Replace that single line with a conditional: if `desc.length <= 100`, keep the existing `textContent = desc` (with the white-space:pre CSS auto-scroll working for short text). If `desc.length > 100`:
  - Compute `dcKey = "review-" + Date.now()` (unique per review render — fresh each time the user navigates to review)
  - Store full text in `modDescFullText[dcKey] = desc`
  - Build the page track using `buildModDescPagesHTML(dcKey, [desc])` (placeholder pages) so the container is in the DOM
  - Set `modDescTotal[dcKey] = 1`, `modDescPageIdx[dcKey] = 0` (placeholders, will be re-paginated on first "Next")
  - Replace the `#event-review-desc-preview` element's `innerHTML` with: `<div id="mod-desc-box-{dcKey}" style="..."><div id="mod-desc-track-{dcKey}">…</div></div>` + a `<div id="mod-desc-nav-{dcKey}">{navHtml}</div>` below
  - Wire the `mod-desc-prev` and `mod-desc-next` action handlers — they already exist at `app.ts:1998-2021` and will work because the button has `data-key="{dcKey}"` and the click handler at line 2151 falls back from `data-id` to `data-key`
  - In a `setTimeout(..., 0)`, call `splitTextToPages(desc, box.clientWidth, box.clientHeight)`, update `modDescTotal[dcKey] = pages.length`, and rebuild the track + nav using `buildModDescPagesHTML` and `buildModDescNavHTML`
- [ ] 3.3 When user navigates back to step 3 (description) and re-advances to step 4 (review), the new `dcKey` ensures a fresh pager — no stale state
- [ ] 3.4 Manual verify: open submit form, fill a long description (>300 chars), navigate to review → see explicit `← Previous` / `Next →` buttons that paginate the text
- [ ] 3.5 Manual verify: navigate back to step 3 (description), edit, re-navigate to step 4 (review) → pager refreshes with new content (new dcKey, new pages)
- [ ] 3.6 Manual verify: open submit form, fill a short description (<100 chars), navigate to review → no pager, just vertical scroll within the preview box

## 4. Mod Dashboard Pending — Details Button + Days Overdue

- [ ] 4.1 In `src/client/app.ts` `renderModCard` (line 1033-1039, the `if (tab === "pending")` block), add a "Details" button to the pending actions row as the FIRST of 3 buttons (before Approve)
- [ ] 4.2 Change the row container's `style` to allow wrapping: `display:flex; gap:8px; flex-wrap:wrap;` (currently just `display:flex; gap:8px;`)
- [ ] 4.3 Fix `showModEventDetails(id)` lookup at `app.ts:1318` to also try `modItems["pending"]`:
  ```ts
  var item = modItems["pending"]?.find(function(e: any) { return e.id === id; }) || modItems["published"]?.find(function(e: any) { return e.id === id; });
  ```
- [ ] 4.4 In `renderModCard` header builder (around line 1004), when `tab === "pending"` and `item.submittedAt` is set:
  - Compute `daysOld = Math.floor((Date.now() - new Date(item.submittedAt).getTime()) / 86400000)`
  - If `daysOld >= 1`, build a badge: `⏰ N day${daysOld === 1 ? '' : 's'} pending` (amber `#ffaa00` for 1 day, red `#ff4444` for 2+)
  - Skip badge if `daysOld === 0`
- [ ] 4.5 Combine with task #5's flex badge row so "Days Overdue" sits inline with the category badge
- [ ] 4.6 Manual verify: open mod dashboard, look at a pending event submitted 3 days ago → see "⏰ 3 days pending" badge next to category, plus 3 buttons in actions row (Details | Approve | Decline)
- [ ] 4.7 Manual verify: click "Details" on a pending event → 4-card mod detail overlay opens (same as for published events). Note: the overlay will show "🔴 No RSVPs" badge for pending events since they have `rsvpCount: 0` — this is correct

## 5. Mod Dashboard — Flatten Badge Row

- [ ] 5.1 In `src/client/app.ts` `renderModCard` (lines 1004-1018), build a single `badges` string by concatenating all relevant badge types (category, days-pending for pending tab, RSVP-count for published tab, past-event)
- [ ] 5.2 Wrap the `badges` string in ONE flex container: `<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px; align-items:center;">{badges}</div>`
- [ ] 5.3 Remove the individual `margin-bottom:6px` from each badge's outer div (the container has it now)
- [ ] 5.4 Apply the same flat-row layout to all three mod tabs (pending, published, pitches) — but pitches shows NO badges (the existing `tab !== "pitches"` guard)
- [ ] 5.5 Manual verify: open mod dashboard, look at a published event with category + 5 going → see "Tech" "🟢 5 going" "⏰ Past Event" all on one row with 6px gap between them

## 6. Mod Dashboard Pitches — Paginated Description In-Card

- [ ] 6.1 In `src/client/app.ts` `renderModCard` (lines 1026-1030), when `tab === "pitches"` and `desc.length > 100`:
  - Compute `dcKey = "pitches-" + item.id`
  - Store full text in `modDescFullText[dcKey]`
  - In a `setTimeout(..., 0)` after DOM insert, call `splitTextToPages(desc, containerWidth, containerHeight)`
  - Store total pages in `modDescTotal[dcKey]`, reset `modDescPageIdx[dcKey] = 0`
  - Replace the body div with a `buildModDescPagesHTML(dcKey, pages)` track + `buildModDescNavHTML(dcKey)` button row
- [ ] 6.2 When `desc.length <= 100`, keep the existing simple 120-char snippet
- [ ] 6.3 Manual verify: open mod dashboard → Pitches tab → find a pitch with long description → see paginated body with `← Previous` / `Next →` buttons

## 7. Mod Dashboard Tab State Sync Bug

- [ ] 7.1 In `src/client/app.ts` `showModDashboard()` (line 936), add the active-class reset and `modTab` variable reset:
  ```ts
  modTab = "pending";
  document.querySelectorAll("#mod-tabs .mod-tab").forEach(function (t) {
    t.classList.toggle("active", (t as HTMLElement).dataset.mtab === "pending");
  });
  ```
- [ ] 7.2 Add `log("showModDashboard resetting active class to pending (was " + modTab + ")")` per LEARNINGS §0.2
- [ ] 7.3 Manual verify: open mod dashboard, switch to "Published" tab, close, reopen → "Pending" tab is now yellow-highlighted (not "Published")
- [ ] 7.4 Manual verify: open mod dashboard, switch to "Pitches" tab, close, reopen → same — "Pending" tab is active

## 8. Home Card — Blinking Countdown Timer

- [ ] 8.1 In `public/app.html` inside the existing `<style>` block, add new keyframe + class:
  ```css
  @keyframes blinkPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.55; }
  }
  .countdown-blink { animation: blinkPulse 1.2s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) {
    .countdown-blink { animation: none !important; }
  }
  ```
- [ ] 8.2 In `src/client/app.ts` `renderHomeCard` (lines 315-334), after computing `relDate` and `dateStr`, compute:
  ```ts
  var hoursToGo: number | null = null;
  if (event._date && event.time) {
    var eventStart = new Date(event._date + "T" + event.time + ":00").getTime();
    var diffH = (eventStart - Date.now()) / 3600000;
    if (diffH > 0 && diffH <= 24) hoursToGo = diffH;
  }
  ```
- [ ] 8.3 When `hoursToGo !== null`, replace the right-aligned `<span>` at line 328 with a `.countdown-blink` span:
  - Label: `⏰ <1 hr to go` (if hoursToGo < 1), `⏰ X hrs to go` (if X < 10, ceil), `⏰ X hrs to go` (if X >= 10, round)
  - Color: `#ff4444` (red), background `#fff3f3`, border 1px solid `#ff4444`, padding `3px 7px`
- [ ] 8.4 When `hoursToGo === null`, keep the existing right-aligned span (relDate + optional dateStr)
- [ ] 8.5 Manual verify: create an event with date=tomorrow, time=in 5 hours from now → home card shows "⏰ 5 hrs to go" in red, blinking
- [ ] 8.6 Manual verify: create an event with date=2 days from now → no countdown (just the regular "In 2 days" text)
- [ ] 8.7 Manual verify: with macOS "Reduce motion" enabled → countdown shows but does not blink

## 9. Verify Who's Going Pager (Already Implemented)

- [ ] 9.1 Read `src/client/app.ts:670-701` (`loadPublicAttendees`, `renderAttendees`, `buildAttNav`) to confirm `ATTENDEES_PER_PAGE = 5` and prev/next buttons are emitted when total pages > 1
- [ ] 9.2 Read `app.ts:1940-1941` action handlers to confirm `att-prev` and `att-next` call `slideTrack` correctly
- [ ] 9.3 Manual verify: open an event with 8 attendees → see "← Previous" / "Next →" pager with page indicator (e.g. "1/2")
- [ ] 9.4 Document in PR description: pager is hidden when total pages <= 1 (i.e., 0-5 attendees). This is by design.

## 10. Logging, Build, Verify

- [ ] 10.1 Add `log()` calls at every changed path per LEARNINGS.md §0.2 (counts as 1 task per file change)
- [ ] 10.2 Run `npm run build` — must pass
- [ ] 10.3 Run `npm run type-check` — must pass
- [ ] 10.4 Run `npm test` — must pass (no new tests required for pure CSS/JSX changes)
- [ ] 10.5 Manual smoke: complete a full submit-event flow (4 cards), verify mod can approve/decline, verify home countdown
- [ ] 10.6 Commit, push, create PR
- [ ] 10.7 `openspec archive e18-ui-polish-bundle-v2`
