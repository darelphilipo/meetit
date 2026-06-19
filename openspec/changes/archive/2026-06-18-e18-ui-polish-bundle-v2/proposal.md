# e18 — UI Polish Bundle v2 (Card Layout, Tab Sync, Countdown)

**Priority:** 2/5
**Status:** implemented (shipped in v1.6.3, commit `a71feb6`)

## What Was Shipped

All 8 items were implemented and shipped as part of v1.6.3:

### D1: Submit Event Wizard — 4 Cards Instead of 5
Location and Map URL inputs moved from step 3 into step 2 (Date/Time). Steps renumbered 5→4. `eventPrev` step-5 block deleted. `eventNext` step-3 now validates description and populates review card. `resetEventForm` uses 4-step arrays.
- `src/client/app.ts` — `resetEventForm` (L1919), `eventPrev` (L1927), `eventNext` (L1949)
- `public/app.html` — step-2 now includes location/map-url fields, step-3 is description, step-4 is review

### D2: Description Textarea — Fill Card Vertically
`event-step-3` overlay-body has `display:flex; flex-direction:column;`. Textarea has `flex:1; min-height:280px;` so it fills the available vertical space.
- `public/app.html` — `event-step-3` style, textarea style

### D3: Review Card — Explicit Previous/Next Pager
Long descriptions (>100 chars) get the same paginated pager used in the mod detail overlay. Fresh `dcKey = "review-" + Date.now()` per navigation ensures no stale state. Short descriptions stay as simple `textContent`. Auto-repaginates after DOM paint via `setTimeout` with a 300ms retry fallback.
- `src/client/app.ts` — `eventNext()` L1988-2034

### D4: Mod Pending — Details Button + Days Overdue Badge
Pending event cards now have 3 buttons: Details | Approve | Decline (Details first). `showModEventDetails` lookup fixed to search `modItems["pending"]` first. Days Overdue badge computed from `submittedAt`: amber for 1 day, red for 2+.
- `src/client/app.ts` — `renderModCard` L1070-1076 (badge), L1155-1158 (buttons), `showModEventDetails` L1443 (pending lookup)

### D5: Mod Published — Flatten Badge Row
All badges (category, RSVP-count, past-event) are built as a single string and wrapped in one flex container with `gap:6px; flex-wrap:wrap;`. Replaces the previous approach of multiple independently-styled badge divs.
- `src/client/app.ts` — `renderModCard` L1065-1088

### D6: Mod Pitches — Paginated Description In-Card
Pitch descriptions >100 chars get in-card pagination using `buildModDescPagesHTML` / `buildModDescNavHTML` with key `"pitches-" + item.id`. Auto-repaginates after DOM paint.
- `src/client/app.ts` — `renderModCard` L1093-1140 (pitches body section)

### D7: Mod Dashboard — Tab State Sync
`showModDashboard()` resets `modTab = "pending"` and toggles active class on `#mod-tabs .mod-tab` elements to the `[data-mtab="pending"]` tab. Clears `modTabCache` for published and pitches so stale data doesn't flash.
- `src/client/app.ts` — `showModDashboard` L986-995

### D8: Home Card — Blinking Countdown
Events in the next 24h show a red badge with "⏰ X hrs to go" that blinks via `@keyframes blinkPulse`. Honors `prefers-reduced-motion`. Badge hidden when event is >24h away or when no time is set.
- `src/client/app.ts` — `renderHomeCard` L347-361
- `public/app.html` — CSS at L122-129

## Out of Scope (still tracked elsewhere)

- Who's Going page pager — was already implemented, verified, no change needed
- Search/filter UI — tracked in `e10-search-filter-ui` (status: future)
- Move debug toggle — tracked in `ux-polish-bundle` (status: partial)
