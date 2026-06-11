# Meetit Full App Audit

> Date: 2026-06-07  
> Scope: All source files, config, build, tests  
> Files audited: `app.ts` (1266 lines), `server.ts` (759 lines), `api.ts` (102 lines), `meetit.ts` (94 lines), `app.html` (349 lines), `devvit.json` (104 lines), `package.json` (28 lines), `build.ts` (56 lines), `meetit-behavior.test.ts` (67 lines)

---

## 🔴 Security Issues (3)

### SEC1: PII sent to external webhook without user consent
- **File:** `src/server/server.ts:352-360`
- **Description:** `onRsvp` sends user email/phone to `GOOGLE_SHEETS_WEBHOOK_URL` (Zapier) without any user consent or disclosure. Users have no way to opt out.
- **Impact:** Privacy violation. If webhook URL is compromised, all RSVP contact info is leaked.
- **Fix:** Add explicit consent checkbox in RSVP form. Store consent in Redis. Only send to webhook if user opted in.
- **Severity:** HIGH

### SEC2: No rate limiting on any endpoint
- **File:** All server endpoints
- **Description:** No rate limiting on RSVP, pitch, submit, or any other endpoint. A malicious user could spam the app with thousands of RSVPs or event submissions.
- **Impact:** Data pollution, Redis exhaustion, subreddit flooding.
- **Fix:** Add per-user rate limits (e.g., max 10 RSVPs/hour, 5 submissions/hour). Store rate limit counters in Redis with TTL.
- **Severity:** MEDIUM

### SEC3: CSV export doesn't escape special characters
- **File:** `src/server/server.ts:627-631`
- **Description:** `onExportAttendees` builds CSV with simple string concatenation. If a username or email contains commas, quotes, or newlines, the CSV breaks or becomes malformed.
- **Impact:** Data corruption in exported CSV. Potential CSV injection if username contains `=`, `+`, `-`, or `@` at the start (Excel interprets these as formulas).
- **Fix:** Use proper CSV escaping (wrap fields in quotes, escape internal quotes). Sanitize fields that start with formula characters.
- **Severity:** MEDIUM

---

## 🟠 Data/Logic Bugs (8)

### BUG1: `onMySubmissions` matches empty organizer
- **File:** `src/server/server.ts:570`
- **Description:** `matchOrg` compares `normalizeUsername(org)` with `normalizeUsername(context.username || "")`. If `context.username` is empty (shouldn't happen after AUTH1 fix, but defensive), `normUser` is `""`. This could match events with empty organizer field.
- **Impact:** Edge case — unauthenticated user could see events with empty organizer in "My Events" tab.
- **Fix:** Add early return if `normUser` is empty.
- **Severity:** LOW

### BUG2: CRON reminder can miss window if server is down
- **File:** `src/server/server.ts:709-715`
- **Description:** Reminder fires when `hoursUntilEvent <= reminderHours && hoursUntilEvent >= 0`. If the CRON misses this window (e.g., server downtime, CRON delay), the reminder is never sent. The `remindedKey` prevents re-sending but also prevents retry.
- **Impact:** Users don't get reminders if CRON has issues.
- **Fix:** Add a retry mechanism — if reminder fails to post, don't set `remindedKey`. Or extend the window to allow retry within 1 hour after event start.
- **Severity:** LOW

### BUG3: Mod alerts fire for ALL items on first run
- **File:** `src/server/server.ts:723-733`
- **Description:** `lastCheck` is initialized to `"0"`. On first CRON run, `submittedAt > 0` is true for ALL existing pending items. This triggers a mod alert for every existing item.
- **Impact:** Noisy — mods get alerts for items they've already seen.
- **Fix:** Initialize `lastCheck` to current timestamp on first run, or add a flag to skip first-run alerts.
- **Severity:** LOW

### BUG4: CRON creates public posts for mod alerts
- **File:** `src/server/server.ts:742-744`
- **Description:** `onCheckEvents` creates a public `submitCustomPost` for mod alerts ("🔔 Meetit: X new item(s) need review"). This is visible to ALL users, not just mods.
- **Impact:** Subreddit flooding. Users see internal mod notifications as public posts.
- **Fix:** Use `sendPrivateMessage` to `/r/subreddit` only (which works). Remove the public post fallback.
- **Severity:** MEDIUM

### BUG5: Hardcoded magic string for default event filter
- **File:** `src/server/server.ts:453`
- **Description:** `getAllApprovedEvents` filters out `e.id !== "default-bangalore-tech-chai"`. This is a hardcoded magic string. If the ID format changes or another default event is added, the filter breaks.
- **Impact:** Default event appears in mod dashboard.
- **Fix:** Use a prefix check (e.g., `!e.id.startsWith("default-")`) or store default event IDs in a Redis set.
- **Severity:** LOW

### BUG6: `onRsvp` doesn't check if event is in the past
- **File:** `src/server/server.ts:345-346`
- **Description:** `onRsvp` verifies event exists with `getActiveEvent(eventId)`, which filters past dates. So RSVP to past events is already blocked. But if `getActiveEvents` cache is stale, a past event could be RSVP'd.
- **Impact:** Edge case — user could RSVP to a past event if cache is stale.
- **Fix:** Add explicit date check in `onRsvp`: `if (event.date < today) return error`.
- **Severity:** LOW

### BUG7: Re-RSVP updates contact info but doesn't notify user
- **File:** `src/server/server.ts:350`
- **Description:** `addRsvp` uses `zAdd` with same member key, which updates the score (timestamp). If user RSVPs again with different email/phone, the contact info is updated silently. No confirmation that info was updated.
- **Impact:** User might not realize their contact info changed.
- **Fix:** Show different toast message for re-RSVP vs new RSVP. Or show current contact info in RSVP overlay if already RSVP'd.
- **Severity:** LOW

### BUG8: `confirmDestructive` global resolve can be overwritten
- **File:** `src/client/app.ts:908-913`
- **Description:** `confirmResolve` is a global variable. If two confirms are triggered simultaneously (e.g., rapid taps on two different delete buttons), the first one's resolve is overwritten.
- **Impact:** Edge case — first confirm never resolves, button stays locked.
- **Fix:** Use a queue or unique resolve per confirm instance.
- **Severity:** LOW

---

## 🟡 UX Issues (15)

### UX1: No refresh button or auto-refresh
- **Description:** No way to refresh events without reloading the page. Users see stale data after RSVPing or leaving an event.
- **Fix:** Add "↻ Refresh" button in header. Auto-refresh `loadHome()` when returning from overlays.
- **Severity:** MEDIUM

### UX2: No timezone display on event times
- **Description:** Events show raw time ("6:00 PM") with no timezone context. The timezone is configured in settings but not shown to users.
- **Fix:** Show "6:00 PM IST" or "Tomorrow at 6 PM" — relative dates are huge for UX.
- **Severity:** MEDIUM

### UX3: No relative dates
- **Description:** Events show "2026-06-08" instead of "Tomorrow" or "In 3 days".
- **Fix:** Add relative date formatter. Show "Today", "Tomorrow", "In X days" on home card.
- **Severity:** MEDIUM

### UX4: Empty state has no actionable CTA
- **Description:** "Wow, so empty! Tap ➕ to pitch an idea" has a hint but no clickable button.
- **Fix:** Add "💡 Pitch an Idea" and "📋 Submit Event" buttons directly in the empty state.
- **Severity:** MEDIUM

### UX5: RSVP confirmation doesn't show event summary
- **Description:** After RSVP, just shows "🎉 You're on the list!" and kicks user to home. No confirmation of what they signed up for.
- **Fix:** Show event title, date, time, location in the success state. Add "📋 Copy Details" button.
- **Severity:** MEDIUM

### UX6: Home card shows one event at a time
- **Description:** Users must tap Prev/Next to see all events. No scroll, no list view.
- **Fix:** Add a list view toggle or swipeable carousel. Or show all events in a scrollable list.
- **Severity:** LOW

### UX7: Event details is a 4-step wizard
- **Description:** Most info could be shown on one scrollable page. 4 steps is overkill for a simple event.
- **Fix:** Consolidate into 2 steps: (1) Quick Info + Description, (2) Attendees + RSVP.
- **Severity:** LOW

### UX8: My Stuff tabs show one item at a time
- **Description:** Each tab (RSVPs, Events, Pitches) shows one item at a time with card navigation. No list view.
- **Fix:** Add list view option or show all items in a scrollable list.
- **Severity:** LOW

### UX9: Mod dashboard shows one item at a time
- **Description:** Same as UX8 — each tab shows one item at a time.
- **Fix:** Add list view or show all items in a scrollable list.
- **Severity:** LOW

### UX10: No attendee preview on home card
- **Description:** Must click "View Details →" then navigate to step 3 to see who's going. 3 taps for basic social proof.
- **Fix:** Show mini avatar initials (e.g., "👤👤👤 +2") on home card next to RSVP count.
- **Severity:** MEDIUM

### UX11: Search/filter UI is commented out
- **Description:** `filterHomeEvents()` exists but the search input is commented out. Users can't search or filter events.
- **Fix:** Re-enable search input and add category filter dropdown.
- **Severity:** LOW (until events list grows)

### UX12: Debug panel toggle overlaps content on small screens
- **Description:** Debug toggle button is fixed at bottom-right. On small screens, it overlaps with event card content.
- **Fix:** Move debug toggle to header or add padding-bottom to content area.
- **Severity:** LOW

### UX13: No loading states for My Stuff tab switches
- **Description:** Initial load shows "Loading..." but tab switches (RSVPs → Events → Pitches) have no loading indicator.
- **Fix:** Show loading spinner or skeleton during tab switch.
- **Severity:** LOW

### UX14: `approveEvent` and `deleteEvent` don't use `setBtnLoading`
- **Description:** These functions manually manage button state (opacity, pointerEvents, text) instead of using the `setBtnLoading` helper. Inconsistent pattern.
- **Fix:** Refactor to use `setBtnLoading` for consistency.
- **Severity:** LOW

### UX15: Mod alerts create public posts visible to all users
- **Description:** Same as BUG4. Mod alerts should be private, not public posts.
- **Fix:** Use `sendPrivateMessage` to `/r/subreddit` only. Remove public post fallback.
- **Severity:** MEDIUM

---

## 🔵 Performance Issues (6)

### PERF1: N+1 queries in `onHome`
- **File:** `src/server/server.ts:288-293`
- **Description:** For each event, calls `getRsvpData` (which does `zRange` + `zScore`). For 20 events, that's 40 Redis calls.
- **Fix:** Batch RSVP counts using `Promise.all` with `zCard` for each event. Or use a single `zCard` per event and cache counts.
- **Severity:** MEDIUM

### PERF2: N queries in `onAllApprovedEvents`
- **File:** `src/server/server.ts:454-459`
- **Description:** For each event, calls `getRsvpCount` (which does `zCard`). For 20 events, that's 20 Redis calls.
- **Fix:** Batch `zCard` calls using `Promise.all`. Or cache counts in event metadata.
- **Severity:** MEDIUM

### PERF3: N queries in `onMySubmissions`
- **File:** `src/server/server.ts:596-602`
- **Description:** For each active event, calls `getUserRsvpScore` to check if user RSVP'd. For 20 events, that's 20 Redis calls.
- **Fix:** Batch `zScore` calls using `Promise.all`. Or store user's RSVP'd event IDs in a separate Redis set.
- **Severity:** MEDIUM

### PERF4: `renderHomeCard` does full DOM rebuild
- **File:** `src/client/app.ts:164-212`
- **Description:** Every Prev/Next navigation rebuilds the entire home card HTML with `innerHTML`. This causes full DOM teardown and rebuild.
- **Fix:** Use DOM diffing or update only the changed elements. Or use a virtual DOM library.
- **Severity:** LOW

### PERF5: `body::before` emoji pattern could cause rendering issues
- **File:** `public/app.html:17-24`
- **Description:** Massive emoji pattern (60px font, 80px line-height, full viewport) rendered as pseudo-element. Could cause rendering issues on low-end devices.
- **Fix:** Reduce emoji count or use a static background image. Or remove entirely.
- **Severity:** LOW

### PERF6: Google Fonts CDN could be slow
- **File:** `public/app.html:7`
- **Description:** Font loaded from Google Fonts CDN. If CDN is slow, text is invisible until font loads (FOIT — Flash of Invisible Text).
- **Fix:** Add `font-display: swap` to font loading. Or use system font fallback.
- **Severity:** LOW

---

## 🟢 Code Quality Issues (12)

### CQ1: `app.ts` is 1266 lines with no modules/classes
- **Description:** Everything is global functions and variables. Hard to maintain, test, or refactor.
- **Fix:** Split into modules (e.g., `home.ts`, `details.ts`, `mod.ts`, `my-stuff.ts`). Use classes or objects for state management.
- **Severity:** MEDIUM

### CQ2: Many `var` declarations instead of `let`/`const`
- **Description:** Intentional for Devvit Web compatibility (older browsers) but still not ideal.
- **Fix:** Use `let`/`const` where possible. Devvit Web targets modern browsers.
- **Severity:** LOW

### CQ3: No error boundaries
- **Description:** If `renderHomeCard` throws, the app is stuck on loading screen. No try/catch around rendering.
- **Fix:** Add error boundaries around critical rendering functions. Show error state if rendering fails.
- **Severity:** MEDIUM

### CQ4: `handleAction` is a giant switch statement with 40+ cases
- **Description:** Hard to maintain and extend. Each new action requires adding a case.
- **Fix:** Refactor into a map: `const actions = { "view-details": showEventDetails, ... }`.
- **Severity:** LOW

### CQ5: `log()` writes to `console.log` which doesn't surface in Devvit Web
- **Description:** The debug panel is the only way to see client logs. `console.log` is useless.
- **Fix:** Remove `console.log` calls or make them conditional on debug mode.
- **Severity:** LOW

### CQ6: `showToast` creates a new div each time
- **Description:** Multiple toasts stack but have no z-index management. Could overlap with other elements.
- **Fix:** Use a toast queue with proper z-index management. Or limit to one toast at a time.
- **Severity:** LOW

### CQ7: `actionLocks` never cleaned up
- **Description:** Locks accumulate forever. For a session-based app this is fine, but could cause memory leaks in long-running sessions.
- **Fix:** Add TTL to locks or clean up after action completes.
- **Severity:** LOW

### CQ8: `CATEGORY_EMOJI` duplicated in `meetit.ts` and `app.ts`
- **Description:** If a category is added to one but not the other, they'll be out of sync.
- **Fix:** Import `CATEGORY_EMOJI` from `meetit.ts` into `app.ts`. Or move to `api.ts` as a shared constant.
- **Severity:** LOW

### CQ9: Duplicate CSS rule in `app.html`
- **File:** `public/app.html:25-26`
- **Description:** `.container { max-width: 600px; margin: 0 auto; }` appears twice.
- **Fix:** Remove duplicate.
- **Severity:** LOW

### CQ10: No `prefers-reduced-motion` media query
- **Description:** Animations (fadeInUp, emojiBounce, tab-fade) don't respect user's motion preferences.
- **Fix:** Add `@media (prefers-reduced-motion: reduce)` to disable animations.
- **Severity:** LOW

### CQ11: No `prefers-color-scheme` support
- **Description:** Always light mode. No dark mode option.
- **Fix:** Add dark mode CSS variables and `@media (prefers-color-scheme: dark)` support.
- **Severity:** LOW

### CQ12: No lint/format scripts
- **Description:** No `eslint`, `prettier`, or formatting config. Code style is inconsistent.
- **Fix:** Add `eslint` and `prettier` config. Add `lint` and `format` scripts to `package.json`.
- **Severity:** LOW

---

## 🔵 Platform/API Issues (Already Documented)

These are already in `BUG_REGISTRY.md` under "Platform & API Limitations". No new issues found.

- P1: `submitComment` broken
- P2: `sendPrivateMessage` to individual users fails
- P3: `modMail.createConversation()` unavailable
- P4: `scheduler.runJob()` one-shot jobs never fire
- P5: `getModerators()` returns empty in playtest
- P6: `settings.get()` without args returns undefined
- P7: Redis writes are eventually consistent
- P8: `hDel` requires array format
- P9: CSP blocks inline onclick
- P10: CSP blocks `confirm()`
- P11: `select` settings return `string[]` not `string`
- P12: No page-level scroll on mobile inline

---

## 📋 Summary

| Category | Count | Severity |
|----------|-------|----------|
| Security | 3 | 🔴 |
| Data/Logic Bugs | 8 | 🟠 |
| UX Issues | 15 | 🟡 |
| Performance | 6 | 🔵 |
| Code Quality | 12 | 🟢 |
| **Total** | **44** | — |

---

## 🎯 Priority Fixes (Top 10)

1. **SEC1** — Add user consent for webhook PII sharing
2. **BUG4/UX15** — Stop creating public posts for mod alerts
3. **SEC2** — Add rate limiting to prevent spam
4. **SEC3** — Fix CSV escaping to prevent injection
5. **PERF1** — Batch RSVP count queries in `onHome`
6. **UX1** — Add refresh button
7. **UX2/UX3** — Add timezone and relative date display
8. **UX4** — Add CTAs to empty states
9. **UX10** — Add attendee preview on home card
10. **CQ3** — Add error boundaries

---

## ✅ What's Working Well

1. **Auth gating** — All destructive actions check ownership or mod status
2. **PII cleanup** — RSVP details cleaned on leave/delete
3. **Distributed locks** — Prevent double-approve race conditions
4. **Client-side caching** — TTL-based caches reduce server load
5. **Request deduplication** — `homeLoadSeq` prevents stale responses
6. **Button state management** — `setBtnLoading` prevents stuck buttons (after BTN1-5 fixes)
7. **Per-action locks** — Prevent double-submit on rapid taps
8. **Date validation** — Client and server reject past dates
9. **iOS Safari fixes** — `position:absolute` instead of `height:100%` in flex
10. **Debug panel** — On-screen logging with copy-all for bug reports

---

## 📝 Recommendations

1. **Add automated tests** — Only 67 lines of tests for shared utilities. Add tests for server handlers and client actions.
2. **Add CI/CD pipeline** — No automated builds or deploys. Add GitHub Actions for type-check, lint, test, and deploy.
3. **Add error monitoring** — No Sentry, no LogRocket. Add error tracking to catch issues in production.
4. **Add analytics** — No usage tracking. Add analytics to understand user behavior.
5. **Add feature flags** — No way to toggle features. Add feature flags for gradual rollouts.
6. **Add API versioning** — No versioning. Add `/api/v1/` prefix for future compatibility.
7. **Add response compression** — No gzip/brotli. Add compression for faster loads.
8. **Upgrade dependencies** — `@devvit/web` 0.12.22 → 0.13.0, TypeScript 5.9.3 → 6.0.3, esbuild 0.27.2 → 0.28.0
9. **Refactor `app.ts`** — Split into modules, use classes/objects for state, add error boundaries.
10. **Add dark mode** — No `prefers-color-scheme` support. Add dark mode for better accessibility.
