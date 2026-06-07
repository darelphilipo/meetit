# Meetit Manual Test Suite

## Results

| Test | Status | Date | Notes |
|------|--------|------|-------|
| Test 1: Complete User Journey | ✅ PASS | 2026-06-07 | All 9/12 steps executed. Skipped: desc pagination, share, copy link. RAW1/CRON/AUTH1/button fixes confirmed. |
| Test 2: Mod Full Cycle | ✅ PASS | 2026-06-07 | All 6/7 steps executed. Skipped: mod desc pagination (verified in Test 1). RAW1/C11/C1 confirmed. |
| Test 3: Validation & Edge Cases | 🔶 BUG FOUND | 2026-06-07 | Dismiss pitch stale cache bug found — dismissId missing lock + cache invalidation. Fixed. Skipped: client validation tests. |

## Quick Reference

```powershell
# Terminal 1: Stream server logs
devvit-cli logs r/meetup_hub2_dev

# After each test case: tap 🐛 → 📋 Copy All, paste both CLI + UI logs to me
```

**Tip:** Pre-fill the RSVP overlay email/phone with known test values to speed up testing.

---

## Test 1: Complete User Journey (Non-Mod)

Run all steps in one session without closing/reopening the app.

| Step | Action | What to Check | Logs to Watch |
|------|--------|---------------|---------------|
| 1.1 | Open the app post | Loading bar 30%→70%→100%, events appear in cards with title/date/time/emoji badge/category badge/organizer/RSVP count/nav arrows | `[HOME]` |
| 1.2 | Tap ➡️ arrow twice, then ⬅️ twice | Cards transition with fade animation, wraps from last→first and first→last | `homeNext` / `homePrev` |
| 1.3 | Tap "View Details →" | Overlay opens: Step 1 (info with all fields), Step 2 (location map link), Step 3 (attendees, paginate if >5), Step 4 (RSVP status) | `showEventDetails` / `[EVENT-DETAILS]` |
| 1.4 | Tap through description pages in Step 1 (Next/Prev) | Description slides, page counter shows correct, Prev blocked at page 1, Next blocked at last page | `detail-desc-next` / `detail-desc-prev` |
| 1.5 | Tap "🎟️ RSVP" → enter `test@example.com`, `+91 98765 43210` → Confirm | Toast "RSVP confirmed! 🎉", overlay closes, home reloads, RSVP count +1 | `submitRsvp` / `[RSVP]` |
| 1.6 | Tap "View Details" again on same event → Step 4 shows "✅ You're going!" → tap "❌ Leave Event" → confirm | Toast "You've left", overlay closes, RSVP count -1 | `leaveEvent` / `[LEAVE]` |
| 1.7 | Tap ➕ → "📅 Create Event" → fill Step 1 (title, auto-filled organizer, pick category "Tech") → Next → Step 2 (date=tomorrow, time=14:00) → Next → Step 3 (location="Bangalore") → Next → Step 4 review → tap "Submit →" | Toast "Event submitted! ✅", overlay closes, submit button NOT greyed out when reopened. **Verify log format:** `[SUBMIT]` shows `id=...` (no `saved=` field since read-after-write check removed) | `submitEvent` / `[SUBMIT]` |
| 1.8 | Tap ➕ → "💡 Pitch Idea" → enter title + description → Submit | Toast "Idea sent! ✅", overlay closes | `submitPitch` / `[PITCH]` |
| 1.9 | Tap 👤 → check all 3 tabs: 🎟️ RSVPs, 📋 My Events (shows pending event with ❌ Cancel), 💡 Pitches (shows pitch) | Each tab shows correct content, tab transition works (fade in/out), description pagination on each card. **Verify log format:** `[MY-SUBMISSIONS]` shows `pitches=N myEvents=N rsvps=N` | `openMyStuff` / `[MY-SUBMISSIONS]` |
| 1.10 | In My Events tab → tap "❌ Cancel" on pending event → confirm | Toast "Deleted", card disappears. **Verify log format:** `[DEL-PEND]` shows `removed` (no `removed=true/false` since read-after-write check removed) | `cancelMyEvent` / `[DEL-PEND]` |
| 1.11 | Tap back to home → find any event card → tap "📤 Share" → paste clipboard | Toast "Link copied! 📋", clipboard has Reddit URL | `shareEvent` |
| 1.12 | Tap "View Details" on event with mapUrl → Step 2 → tap "📋 Copy" on location link → paste clipboard | Toast "Link copied! 📋", clipboard has map URL | `copy-link` |

---

## Test 2: Mod Full Cycle

| Step | Action | What to Check | Logs to Watch |
|------|--------|---------------|---------------|
| 2.1 | Tap 👤 → "🛡️ Mod Dashboard" | Overlay opens with 3 tabs: 📝 Pending Events (active), 📋 Published Events, 💡 Pitches. Nav arrows on cards. | `showModDashboard` / `[PENDING]` |
| 2.2 | View a pending event → tap ⬅️ on first card | Wraps to last card (not blocked) | `modPrev` (C11 fix) |
| 2.3 | Navigate description pages on a mod card (Next/Prev) | Pages change correctly, no double-increment | `mod-desc-next` / `mod-desc-prev` |
| 2.4 | Tap "✅ Approve & Publish" on a pending event → confirm | Toast "Event approved!", card moves to Published tab. **Verify log format:** `[APPROVE]` shows title + `approved` (no `active=/pending=` verification fields) | `approveEvent` / `[APPROVE]` |
| 2.5 | Switch to 💡 Pitches tab → tap "🗑️ Delete" on a pitch → confirm | Toast "Idea dismissed", card disappears. **Verify log format:** `[DISMISS]` shows `Idea X removed` (no `ok=true/false`) | `dismissIdea` / `[DISMISS]` |
| 2.6 | Switch to 📋 Published Events → tap "📋 Copy CSV" on an event with RSVPs → paste clipboard | Toast "CSV copied!", clipboard has `Username,Email,Phone` + rows | `exportAttendeesCSV` / `[EXPORT]` |
| 2.7 | Tap "🗑️ Delete" on a published event → confirm | Toast "Deleted", card disappears. **Verify log format:** `[DEL-PUB]` shows `removed | rsvp_members=N` (no `removed=true/false`). Verify RSVP data cleaned up (C1) | `deleteEvent` / `[DEL-PUB]` |

---

## Test 3: Validation & Edge Cases

| Step | Action | What to Check | Logs to Watch |
|------|--------|---------------|---------------|
| 3.1 | Tap View Details → Step 4 → tap "🎟️ RSVP" → enter `not-an-email` → Confirm | Toast "Invalid email format", overlay stays open, **no server request** | client-side validation only |
| 3.2 | Tap ➕ → Create Event → Step 1: leave category as "Select category..." → Next | Toast "Select a category", stays on Step 1 | `eventNext` validation |
| 3.3 | Fill Step 1 properly → Step 2: set date = yesterday → complete → Submit | Toast "Event date must be today or in the future", no submit | client-side validation |
| 3.4 | (If possible) Open app with NO active events | Shows "🐱 Wow, so empty!" + "Tap ➕ to pitch an idea" | empty state render |
| 3.5 | Open any form (RSVP/Pitch/Event) → tap submit button rapidly 3x | Only 1 request fires, button shows loading state immediately | lock prevents duplicates |
| 3.6 | Switch to My Stuff tab with 0 items on all 3 tabs | Each tab shows empty-state graphic + CTA | empty state per tab |
| 3.7 | Open event details → Step 4 → tap RSVP → leave email+phone blank → Confirm | Should accept empty fields (optional), RSVP succeeds | `submitRsvp` / `[RSVP]` |
| 3.8 | Tap 👤 → My Events → remove pending event via earlier test → verify My Events tab now shows 0 | Empty state renders | `loadMySubmissions` |
| 3.9 | **(AUTH1 fix)** Verify RSVP/Leave require authentication: manually POST to `/api/rsvp` with empty/absent `context.username` | Server returns `401 Authentication required` | `[RSVP]` not logged (rejected before processing) |
| 3.10 | **(RAW1 fix)** Submit event, dismiss idea, delete event, approve event — verify ALL succeed with success toast (no false negatives from stale reads) | Every write action returns success. Logs show `[SUBMIT]`, `[DEL-*]`, `[APPROVE]`, `[DISMISS]` without `saved=` or `removed=` boolean fields | No `⚠️ FAILED` warnings in logs |

---

## Log Tag Reference

| Tag | Endpoint | Expected Format (post-fix) |
|-----|----------|---------------------------|
| `[HOME]` | Home page load | `Loading events for user X` + `Found N events` |
| `[EVENT-DETAILS]` | View event | `eventId=X username=Y` |
| `[RSVP]` | RSVP/Update | `username → eventId (email=, phone=)` |
| `[LEAVE]` | Leave event | `Removing username from key` |
| `[MY-RSVP]` | Fetch contact | `eventId \| user=X \| hasEmail \| hasPhone` |
| `[RSVP-LIST]` | List attendees | `eventId \| N attendees \| contact=bool` |
| `[PITCH]` | Submit pitch | `"title" by u/username` |
| `[SUBMIT]` | Submit event | `"title" by username \| id=... \| category=... \| emoji=...` (no `saved=` field — RAW1 fix) |
| `[APPROVE]` | Approve event | `"title" approved` (no `active=/pending=` fields — RAW1 fix) |
| `[DEL-PEND]` | Delete pending | `eventId removed` (no `removed=true/false` — RAW1 fix) |
| `[DEL-PUB]` | Delete published | `eventId removed \| rsvp_members=N` (no `removed=true/false` — RAW1 fix) |
| `[DISMISS]` | Dismiss idea | `Idea X removed` (no `ok=` field — RAW1 fix) |
| `[PENDING]` | List pending | `N pending events` |
| `[PITCHES]` | List pitches | `N pitched ideas` |
| `[ALL-APPROVED]` | Mod published list | `Total approved events in Redis: N` |
| `[MY-SUBMISSIONS]` | My Stuff | `pitches=N myEvents=N rsvps=N` |
| `[EXPORT]` | Export CSV | `eventId \| N attendees \| by username` |
| `[CRON]` | Scheduler | `check-events FIRED at ...` (no `TypeError` from timezone — section 30 fix) |
| `[NOTIFY]` | Mod alerts (disabled) | `disabled (submitComment broken)` — API1 fix |
