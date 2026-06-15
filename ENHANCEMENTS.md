# ⚠️ ARCHIVED 2026-06-15 — see `openspec/changes/` for active tracking

> All active enhancement tracking now lives in OpenSpec.
> Run `openspec list` to see the current backlog.
> This file is kept for historical context only — do not edit.

---

# Meetit Enhancement Backlog (HISTORICAL)

> **Status at archive:** E1, E2, E3, E9, E10 still pending → moved to `openspec/changes/e1-`, `e2-`, `e3-`, `e9-`, `e10-`.
> E4, E5, E6, E7, E8 completed in v1.3.x/v1.4.0 — see git log.
> Priority: HIGH > MEDIUM-HIGH > MEDIUM > LOW-MEDIUM  
> Effort: S (1-2h) / M (3-5h) / L (5-10h) / XL (10h+)  
> Status: pending / in-progress / done

---

## Tier 1 — High Impact

### E1: Event Capacity / Max Attendees
- **Priority:** HIGH
- **Effort:** M
- **Status:** pending
- **Description:** Add `maxAttendees` field to event creation. Show "3/20 spots filled" progress bar on home card and detail view. Block RSVPs when full. Enable waitlist mode (optional).
- **Affected files:** `src/shared/api.ts` (new field), `src/server/server.ts` (validator, RSVP gate), `src/client/app.ts` (progress bar UI, full state), `public/app.html` (step 4 review shows capacity)
- **Notes:** Unlimited RSVPs currently. No urgency or scarcity. Adding capacity is the single biggest conversion lever for meetup apps.

### E2: Edit Event After Submission
- **Priority:** HIGH
- **Effort:** M
- **Status:** pending
- **Description:** Allow organizers (and mods) to edit a published or pending event. Reuse the 4-step form pre-filled with existing data. Owner-or-mod auth (same as delete).
- **Affected files:** `src/shared/api.ts` (new `EditEventFormData` type, `/api/edit-event` endpoint), `src/server/server.ts` (new handler, Redis `hSet` update), `src/client/app.ts` (edit flow, pre-fill form), `public/app.html` (edit button in My Stuff and mod dashboard)
- **Notes:** Currently must delete and resubmit, which loses all RSVPs. This is a top user complaint for any event platform.

### E3: Attendee Preview on Home Card
- **Priority:** MEDIUM-HIGH
- **Effort:** M
- **Status:** pending
- **Description:** Show mini avatar initials (e.g., "👤👤👤 +2") on the home card next to the RSVP count. Batch RSVP counts in `/api/home` response. Social proof dramatically increases RSVP conversion.
- **Affected files:** `src/server/server.ts` (include attendee usernames in home response), `src/client/app.ts` (render avatar row on card), `src/shared/api.ts` (extend `HomeState` type)
- **Notes:** Currently must click "View Details →" then navigate to step 3 to see who's going. This is 3 taps for basic social proof.

---

## Tier 2 — Medium Impact

### E4: Pull-to-Refresh / Auto-Refresh  *(done v1.3.x)*
- **Description:** Add a visible "↻ Refresh" button in the header. Auto-refresh `loadHome()` when returning from overlays (RSVP, event details, My Stuff). Invalidate caches on mutations.
- **Affected files:** `src/client/app.ts` (refresh action, cache invalidation on RSVP/leave/submit), `public/app.html` (refresh icon in header)
- **Notes:** No way to refresh events without reloading the page. Users see stale data after RSVPing or leaving an event.

### E5: Mod Dashboard — Attendee Count Badges & Sort  *(done v1.3.x)*
- **Description:** Color-coded attendee count badges on Published tab (🔴 0, 🟡 1-4, 🟢 5+). Sort published events by RSVP count descending. Show total RSVPs across all events in the mod header.
- **Affected files:** `src/client/app.ts` (badge rendering in `renderModCard`, sort logic in `renderModPublished`), `src/server/server.ts` (already returns `rsvpCount`)
- **Notes:** Mods can't tell at a glance which events are popular. Sorting by date is less useful than sorting by engagement.

### E6: Localize Date/Time with Timezone  *(done v1.4.0)*
- **Description:** Show timezone abbreviation next to times (e.g., "6:00 PM IST"). Show relative dates on home card ("Tomorrow", "In 3 days"). The timezone is already configured in settings and used by CRON.
- **Affected files:** `src/client/app.ts` (format dates with tz label, relative date helper), `src/server/server.ts` (include timezone in init/home response), `src/shared/api.ts` (add timezone to `HomeState`)
- **Notes:** CRON already uses the configured timezone but users see no indication. "6:00 PM" is ambiguous for communities spanning timezones.

### E7: Empty State — Add CTA Buttons  *(done v1.3.x)*
- **Description:** Replace "Wow, so empty! Tap ➕ to pitch an idea" with actionable buttons: "💡 Pitch an Idea" and "📋 Submit Event" directly in the empty state. Same for My Stuff empty states.
- **Affected files:** `src/client/app.ts` (update empty state HTML in `renderHomeCard`, `renderMyRsvpCard`, `renderMyPitchCard`, `renderMyEventCard`)
- **Notes:** Trivial HTML change. The ➕ icon in the header is small and easy to miss. Direct CTAs in the empty state increase first-action rate.

### E8: RSVP Confirmation — Show Event Summary  *(done v1.4.0)*
- **Description:** After RSVP, instead of just "🎉 You're on the list!", show: event title, date, time, location, and a "📋 Copy Details" button. Optionally add "Add to Calendar" link generation.
- **Affected files:** `src/client/app.ts` (enhance RSVP success state in `openDetailsOverlay` step 4, or show a post-RSVP overlay)
- **Notes:** Currently kicks user to home after RSVP with no confirmation of what they signed up for. This is a trust issue.

---

## Tier 3 — Lower Impact (Nice to Have)

### E9: Notification Opt-In Prompt
- **Priority:** MEDIUM
- **Effort:** L
- **Status:** pending
- **Description:** After RSVP, show "🔔 Remind me before this event" checkbox. Store opt-in intent in Redis (`meetit:notify_opt_in:{eventId}:{username}`). When Devvit push notifications are approved, use stored opt-ins. Fallback: CRON reminder posts already exist.
- **Affected files:** `src/client/app.ts` (opt-in checkbox in RSVP overlay), `src/server/server.ts` (new `/api/notify-opt-in` endpoint, Redis key), `src/shared/api.ts` (new endpoint), `devvit.json` (if push notification permissions needed)
- **Notes:** Push notifications are gated beta (2/user/day, 25K/app/day). Storing intent now means zero migration work when approved.

### E10: Search/Filter UI — Re-enable
- **Priority:** LOW-MEDIUM
- **Effort:** S
- **Status:** pending
- **Description:** Re-enable the search input and add a category filter dropdown. The `filterHomeEvents()` function exists but the UI is commented out. Add a search bar below the header and a category pill bar.
- **Affected files:** `src/client/app.ts` (uncomment search listener, add category filter), `public/app.html` (add search bar + category pills in header area)
- **Notes:** Code is already written. Just needs UI elements. Low priority until events list grows beyond ~10.

---

## Enhancement Template (For Future Additions)

When adding a new enhancement, copy this template and fill it out:

```markdown
### EX: Feature Name
- **Priority:** HIGH / MEDIUM / LOW
- **Effort:** S / M / L / XL
- **Status:** pending
- **Description:** What this feature does and why it matters.
- **Affected files:** `src/client/app.ts`, `src/server/server.ts`, etc.
- **Logging required:**
  - [ ] Client: `log("feature action detail")` for every user action
  - [ ] Server: `console.log("[FEATURE] detail")` for every handler
  - [ ] Error paths logged with full context
  - [ ] State mutations logged (cache updates, optimistic updates)
- **Notes:** Any special considerations.
```

---

## Completed Enhancements

### E4: Pull-to-Refresh / Auto-Refresh ✅
- **Status:** done
- **Changes:** Added ↻ refresh button in header (`app.html`). Added `refresh-home` action handler (`app.ts:1089`). Auto-refresh `loadHome()` called after pitch submission (`app.ts:1066`) and event submission (`app.ts:1070`).

### E5: Mod Dashboard — Attendee Count Badges & Sort ✅
- **Status:** done
- **Changes:** Published events now sort by RSVP count descending (`renderModPublished` in `app.ts`). Added color-coded badges: 🔴 No RSVPs (0), 🟡 1-4 going, 🟢 5+ going (`renderModCard` in `app.ts`).

### E6: Localize Date/Time with Timezone ✅
- **Status:** done
- **Changes:** Server sends timezone in `/api/init` response (`server.ts:278`). Client stores timezone via `setAppTimezone()` (`app.ts:75`). Added `relativeDate()` helper showing "Today", "Tomorrow", "In X days" (`app.ts:76-84`). Home card shows relative date with full date fallback (`app.ts:181`). Time display includes timezone label (`app.ts:193`).

### E7: Empty State — Add CTA Buttons ✅
- **Status:** done
- **Changes:** Home empty state now has "💡 Pitch Idea" and "📋 Submit Event" buttons (`renderHomeCard` in `app.ts:169`). My Stuff tabs (RSVPs, Events, Pitches) each have relevant CTA buttons (`renderMyRsvpCard`, `renderMyPitchCard`, `renderMyEventCard`).

### E8: RSVP Confirmation — Show Event Summary ✅
- **Status:** done
- **Changes:** After RSVP success, detail overlay shows event summary card with title, date, time, location, and "📋 Copy Details" + "Done →" buttons (`submitRsvp` in `app.ts:1044-1060`). Added `copy-event-details` action handler (`app.ts:1196`).

---

## Bug Registry

See [BUG_REGISTRY.md](./BUG_REGISTRY.md) for known bugs.
See [LEARNINGS.md](./LEARNINGS.md) for platform quirks and patterns.