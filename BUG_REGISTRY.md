# Meetit Bug Registry — Complete Audit Reference

> Every bug, crash, quirk, and niggle that has occurred in the app, in chronological order of discovery.

---

## 🔴 Critical Bugs (Data Loss / Security / Crashes)

| # | Bug | Root Cause | Fix | Date |
|---|-----|------------|-----|------|
| C1 | **PII leak — RSVP contact info persisted after leave/delete** | `onLeaveEvent` and `onDeletePublished` only removed from RSVP sorted set, never cleaned up companion `rsvp_details` hash | Added `hDel` cleanup for contact details on leave + bulk delete on event deletion | 2026-06-05 |
| C2 | **Double-submit on rapid taps** | No locks on `submitPitch`, `submitEvent`, `submitRsvp` | Added per-action `isLocked/lock/unlock` guards with `finally` release | 2026-06-05 |
| C3 | **Backdrop dead click zone on create menu** | Backdrop element had no click handler | Added `data-action="close-create-menu"` to backdrop | 2026-06-05 |
| C6 | **RSVP accepted fake event IDs** | `onRsvp` wrote to Redis without verifying event exists | Added `getActiveEvent(eventId)` check, returns 404 if missing | 2026-06-05 |
| C7 | **Approve returned success for missing events** | `onApproveEvent` skipped `if (eventJson)` block silently, returned `{success:true}` | Added explicit 404 return when event not found in pending | 2026-06-05 |
| C11 | **Mod description pagination double-increment** | Direct `addEventListener` in `bindModDescNav()` co-fired with event delegation `handleAction` | Removed `bindModDescNav()`, all nav via single `handleAction` dispatcher | 2026-06-03 |
| CRON | **CRON crashing every 5 minutes** | Devvit `select` settings return `string[]` not `string`; `timezone.startsWith()` failed on array | Added `normalizeTimezone()` helper to unwrap array | 2026-06-07 |
| BTN1 | **Pitch button stuck at "Submitting..."** | Success path closed overlay without resetting button loading state | Added `setBtnLoading(..., false)` on success | 2026-06-07 |
| BTN2 | **Event submit button blank text** | `setBtnLoading` not idempotent; `closeOverlay` → `resetEventForm` double-called `setBtnLoading(false)` | Made `setBtnLoading` idempotent (only restore if `originalText` exists) | 2026-06-07 |
| BTN3 | **Leave button stuck at "Leaving..."** | Success path closed overlay without resetting button | Added `setBtnLoading(..., false)` before `closeOverlay` | 2026-06-07 |
| BTN4 | **Approve button stuck at "Approving..."** | Success path reloaded tab without restoring button text/opacity | Added manual button restoration on success | 2026-06-07 |
| BTN5 | **Delete button/parent opacity stuck grey** | Success path deleted from cache and reloaded tab without restoring opacity | Added opacity restoration before `loadModTab` | 2026-06-07 |
| RAW1 | **False "failed" responses from read-after-write** | `onSubmitEvent`, `onDismissIdea`, `onDeletePending`, `onDeletePublished`, `onApproveEvent` all used `await redis.hGet()` immediately after write to determine success | Removed all read-after-write checks; trust the write, return `success: true` | 2026-06-07 |
| API1 | **Dead code using broken `reddit.submitComment()`** | `notifyMods` and `onSendEventAnnouncement` both called `reddit.submitComment()` which crashes with `ERR_INVALID_ARG_TYPE` in Devvit Web | `notifyMods` made into safe no-op with log; `onSendEventAnnouncement` removed entirely | 2026-06-07 |
| API2 | **Dead code using broken individual DMs** | `onSendReminders` called `sendPrivateMessage({to: username})` which fails for individual users | Function made into safe no-op pointing to active `onCheckEvents` CRON | 2026-06-07 |
| AUTH1 | **Empty username RSVP collision risk** | `onRsvp` and `onLeaveEvent` used `context.username \|\| ""` — multiple unauthenticated users could collapse into same RSVP key | Both endpoints now reject with 401 `Authentication required` if `context.username` is empty | 2026-06-07 |
| DC1 | **Dismiss pitch stale cache + no lock** | `dismissIdea` called `loadModTab("pitches")` without invalidating `modTabCache` first + no `isLocked/lock/unlock` guard | Cache deleted before reload; per-action lock added | 2026-06-07 |

---

## 🟡 UI/UX Bugs (Broken Flows / Layout Issues)

| # | Bug | Root Cause | Fix | Date |
|---|-----|------------|-----|------|
| U1 | **Mobile scroll doesn't work in inline webview** | Devvit inline webview blocks page-level scroll | Multi-step forms (2 fields/step) + floating scroll arrows | Early |
| U2 | **Inline `onclick` blocked by CSP** | Devvit CSP blocks inline event handlers | Switched to `addEventListener` with CSS class selectors | Early |
| U3 | **Confirm() dialog blocked by CSP** | Browser `confirm()` returns `false` silently | Built custom Neo-Brutalist confirm overlay | Early |
| U4 | **Server error messages not shown in toasts** | 6 action functions only checked `res.ok`, never parsed `data.error` | Added `tryShowServerError()` helper, wired into all actions | 2026-06-05 |
| U5 | **My Stuff RSVP cards missing "Update Contact"** | Button only existed in event details, not My Stuff RSVP cards | Added "✏️ Update Contact" button directly on My Stuff RSVP cards | 2026-06-05 |
| U6 | **My Stuff tab navigation broken** | `myRsvpNext()` / `myRsvpPrev()` existed but weren't wired into action dispatcher | Added cases to `handleAction()` dispatcher | 2026-06-05 |
| U7 | **Empty My Stuff tabs showed nothing** | No empty-state handling for 0-item tabs | Added `.empty-state` pattern with emoji + heading + CTA per tab | 2026-06-05 |
| U8 | **Copy toast inconsistent** | Location "Copy" button showed no toast; Share button did | Unified both to use same "Link copied! 📋" toast | 2026-06-05 |
| U9 | **Mod card layout inconsistent** | All 3 tabs showed identical buttons regardless of context | Feature-based conditional rendering (pending/published/ideas each have unique button sets) | 2026-06-03 |
| U10 | **Pending card nav arrows not full-width** | Approve/Decline buttons had fixed padding, small tap targets | Made all action buttons `flex:1` for full-width balanced layout | 2026-06-03 |
| U11 | **Mod Prev button blocked at first card** | `modPrev()` stopped at index 0 instead of wrapping | Changed to wrap from first → last (`items.length - 1`) | 2026-06-03 |
| U12 | **Description pagination skipped pages on rapid click** | No lock on pagination, iOS double-tap caused double increment | Added per-instance `mod-desc-{id}` lock with 300ms timeout | 2026-06-03 |
| U13 | **Detail overlay content overflowed on iOS** | `height:100%` inside flex containers resolves as `auto` on iOS Safari | Replaced with `position:absolute` to lock to parent bounds | 2026-05-30 |
| U14 | **Home card description not paginated** | Long descriptions caused internal scrolling inside cards | Added horizontal description pagination with Next/Prev buttons | 2026-06-05 |
| U15 | **Share button takes too much vertical space** | Share button was block-level below card content | Made Share inline with RSVP count, compact layout | 2026-06-05 |
| U16 | **Cards too tall on short events** | `height:100%` caused huge empty space below description | Switched to content-height cards with `max-height` fallback | 2026-06-05 |
| U17 | **Loading screen not animated** | Static text "Loading..." with no feedback | Added cycling emojis + progress bar + themed messages | 2026-06-05 |
| U18 | **Debug panel logs not copyable** | No way to export logs for bug reports | Added sticky "📋 Copy All" button with clipboard + textarea fallback | 2026-06-07 |
| U19 | **Debug Copy All button scrolled away** | `position:sticky` unreliable inside `overflow-y:auto` on mobile | Restructured panel into fixed header + scrollable log area using flexbox | 2026-06-07 |
| U20 | **Search/filter UI takes too much space** | Search bar occupied header area on mobile | Hidden search UI (code preserved for future when event list grows) | 2026-06-05 |

---

## 🟠 Data & Logic Bugs (Incorrect Behavior)

| # | Bug | Root Cause | Fix | Date |
|---|-----|------------|-----|------|
| D1 | **Events "disappearing" after some time** | `getActiveEvents()` filtered past dates; users created events with yesterday's date | Added client+server date validation (date >= today) | 2026-06-05 |
| D2 | **Past events invisible to mods** | `onAllApprovedEvents()` used `getActiveEvents()` which filters past dates | Split into `getActiveEvents()` (public) vs `getAllApprovedEvents()` (mod, unfiltered) | 2026-06-05 |
| D3 | **Events swapping positions after RSVP** | `getActiveEvents()` sorted only by date; same-date events had unstable order from `hGetAll` | Added secondary sort by time: `.sort((a,b) => a.date.localeCompare(b.date) \|\| a.time.localeCompare(b.time))` | 2026-06-07 |
| D4 | **RSVP'd own events not in My Stuff** | `onMySubmissions()` filtered out events where `matchOrg(event.organizer)` even if user RSVP'd | Removed `!matchOrg` filter so RSVP'd events appear in My Stuff RSVPs tab | 2026-06-05 |
| D5 | **Stale home data after RSVP/leave** | `loadHome()` cache wasn't invalidated on state changes | Added `delete detailCache[id]` and `delete attendeeCache[id]` on RSVP/leave | 2026-06-05 |
| D6 | **Race condition in loadHome** | Rapid calls to `loadHome()` could have slower response overwrite faster newer response | Added `homeLoadSeq` counter — discard stale responses | 2026-05-30 |
| D7 | **Stale detail overlay after rapid nav** | User could tap "View Details" on event A, then event B before A's response arrived | Added `detailLoading` flag + `currentEventId === id` check after fetch | 2026-05-30 |
| D8 | **Duplicate button binding** | `btn-load-attendees` bound twice in `bindButtons()` — once in mod section, once in detail-nav | Removed duplicate binding | 2026-05-30 |
| D9 | **Last event stuck in pending** | `hDel` with single string argument silently fails (doesn't delete) | Changed to array format: `hDel(key, [field])` | Early |
| D10 | **zScore returns undefined not null** | Used `!== null` check which passes for `undefined` | Changed to `!= null` (loose equality) | Early |
| D11 | **zRem eventually consistent** | Immediate read after `zRem` showed stale data | Removed verification reads; trust the write | Early |
| D12 | **Context username undefined** | `context.username` sometimes empty in inline webview | Added fallback to "unknown" + logging | Early |

---

## 🔵 Platform & API Limitations (Devvit Quirks)

| # | Limitation | Impact | Workaround | Date |
|---|------------|--------|------------|------|
| P1 | **`reddit.submitComment()` broken** | `ERR_INVALID_ARG_TYPE` from all contexts | Disabled; use `submitCustomPost` for notifications | 2026-05-27 |
| P2 | **`sendPrivateMessage` to individual users fails** | `ERR_INVALID_ARG_TYPE` for `to: username` | Use `to: "/r/subreddit"` for modmail (works in CRON) | 2026-05-27 |
| P3 | **`modMail.createConversation()` unavailable** | Not in Devvit Web API | Save to Redis + display in Mod Dashboard | Early |
| P4 | **`scheduler.runJob()` one-shot jobs never fire** | Jobs scheduled but never execute in inline context | Use CRON-based scheduler (`*/5 * * * *`) | 2026-05-15 |
| P5 | **`getModerators()` returns `{children: []}` in playtest** | Mod detection fails in dev environment | Manual mod whitelist via `mod_usernames` settings field | 2026-05-27 |
| P6 | **`settings.get()` without args returns undefined** | Crashes with "Cannot read properties of undefined" | Always pass key: `settings.get("key")` | Early |
| P7 | **Redis writes are eventually consistent** | Read immediately after write may show stale data | Trust the write; don't verify immediately | Early |
| P8 | **`hDel` requires array format** | Single string argument silently succeeds but doesn't delete | Always wrap in array: `hDel(key, [field])` | Early |
| P9 | **CSP blocks inline onclick** | Handlers don't fire | Use `addEventListener` + CSS class selectors | Early |
| P10 | **CSP blocks `confirm()`** | Dialog returns false silently | Custom in-app confirm overlay | Early |
| P11 | **`select` settings return `string[]` not `string`** | `timezone.startsWith()` crashes CRON | `normalizeTimezone()` helper to unwrap array | 2026-06-07 |
| P12 | **No page-level scroll on mobile inline** | Content taller than viewport gets clipped | Multi-step forms + internal scrolling containers | Early |

---

## 🟢 Architecture & Refactoring Issues

| # | Issue | What Happened | Lesson | Date |
|---|-------|----------------|--------|------|
| A1 | **Deleted helper functions while cleaning "dead" code** | Removing `onSendReminders` also deleted `writeJSON`, `readJSON`, `readRaw` — app crashed with `ReferenceError` | Never batch-delete across function boundaries; search for references first | Early |
| A2 | **Event delegation vs direct listeners conflict** | Both patterns attached to same elements causing double-fires | Pick ONE pattern globally; never mix them | 2026-06-03 |
| A3 | **Global mutable state refactor attempt** | Tried to encapsulate all globals into objects; user reverted | Don't refactor without clear benefit; user knows their codebase | 2026-06-05 |
| A4 | **Client-side `console.log` doesn't surface** | Devvit Web iframe doesn't show client console | Built on-screen debug panel for client logs | 2026-06-07 |
| A5 | **Expanded mode incompatible with overlay architecture** | `requestExpandedMode()` destroyed all overlay DOM elements | Stuck with inline mode + multi-step forms | Early |

---

## 📋 Summary by Category

| Category | Count | Severity |
|----------|-------|----------|
| Critical (Data/Security/Crash) | 12 | 🔴 |
| UI/UX (Layouts/Buttons/Flows) | 20 | 🟡 |
| Data/Logic (Incorrect Behavior) | 12 | 🟠 |
| Platform Limitations | 12 | 🔵 |
| Architecture/Refactoring | 5 | 🟢 |
| **Total** | **61** | — |

---

## 🎯 Audit Checklist

When reviewing the app, verify these specific fixes are still in place:

- [ ] C1 — `onLeaveEvent` cleans up `rsvp_details` hash
- [ ] C1 — `onDeletePublished` cleans up all RSVP data
- [ ] C2 — All submit actions have `isLocked/lock/unlock` guards
- [ ] C6 — `onRsvp` verifies event exists before writing
- [ ] C7 — `onApproveEvent` returns 404 for missing events
- [ ] C11 — Only event delegation pattern used (no direct listeners on paginated elements)
- [ ] CRON — `normalizeTimezone()` handles `string[]` from select settings
- [ ] BTN1-5 — All success paths reset button state before closing overlay/navigating
- [ ] D3 — Sort includes secondary `time` sort for same-date events
- [ ] D2 — Mod dashboard uses unfiltered `getAllApprovedEvents()`
- [ ] D1 — Date validation on client and server rejects past dates
- [ ] U13 — iOS Safari uses `position:absolute` not `height:100%` inside flex
- [ ] U12 — Per-instance locks on all pagination actions
- [ ] U18 — Debug panel has working "📋 Copy All" button
- [ ] P4 — CRON-based scheduler used (not one-shot `runJob`)
- [ ] P5 — Mod whitelist via settings as fallback to `getModerators()`

---

## 🔍 How to Verify a Fix is Still Working

1. **C1 (PII cleanup):** RSVP to event → leave event → check `redis.hGetAll("meetit:rsvp_details:{id}")` — should be empty for that user
2. **C2 (Double-submit):** Rapid-tap submit button 3x → only 1 server log entry should appear
3. **C6 (Fake event RSVP):** Craft POST to `/api/rsvp` with fake `eventId` → should return 404
4. **C11 (Double-increment):** Rapid-click description Next 5x on mod card → should advance 1 page per click, no skips
5. **CRON (Timezone):** Check logs for `[CRON] check-events FIRED` with no `TypeError`
6. **BTN1-5 (Button reset):** Submit pitch/event → success → reopen overlay → button text should be normal, not blank or "⏳..."
7. **D3 (Time sort):** Create 2 events on same date with different times → order should match time ascending
8. **U13 (iOS height):** Test on iOS Safari — cards should not expand beyond viewport
9. **U18 (Copy logs):** Tap 🐛 → 📋 Copy All → paste should show timestamped log entries
