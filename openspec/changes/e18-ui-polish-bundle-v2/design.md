# Design — e18 UI Polish Bundle v2

## Context

App is working (v1.6.2 shipped). User reported 9 polish items. One is a real state-management bug (#7 — mod dashboard tab state goes out of sync with rendered content). The rest are layout/visual cleanup. All items must ship WITHOUT breaking existing flows (form validation, RSVP submit, mod approval, detail overlays, attendee pagination).

## Decisions

### D1. Submit event: move card 3 fields into card 2, NOT delete the inputs

The form reads fields by `id` (`event-location`, `event-map-url`), not by card position. Both fields are referenced in `submitEvent()` (line 1880) and `resetEventForm()` (line 1796). **Move** the inputs into `event-step-2` and renumber 5→4 cards. Don't delete the inputs.

**Before (5 cards):**
| Card | DOM id | Fields |
|------|--------|--------|
| 1 | `event-step-1` | title, category, organizer |
| 2 | `event-step-2` | date, time |
| 3 | `event-step-3` | location, map URL |
| 4 | `event-step-4` | description |
| 5 | `event-step-5` | review |

**After (4 cards):**
| Card | DOM id | Fields |
|------|--------|--------|
| 1 | `event-step-1` | title, category, organizer (unchanged) |
| 2 | `event-step-2` | date, time, **location, map URL (moved in)** |
| 3 | `event-step-3` (was `event-step-4`) | description |
| 4 | `event-step-4` (was `event-step-5`) | review |

Required DOM changes (`app.html` lines 370-431):
- Delete `event-step-3` div (lines 407-410) and `event-dot-3` (line 376)
- Rename `event-step-4` → `event-step-3` (lines 411-416) and `event-dot-4` → `event-dot-3` (line 377)
- Rename `event-step-5` → `event-step-4` (lines 417-425) and `event-dot-5` → `event-dot-4` (line 378)
- Add the two `.form-group` blocks (location + map URL) into `event-step-2` after the existing `.form-row`
- Update the comment on line 370 from "5 steps" to "4 steps"

Required JS changes (`src/client/app.ts`):
- `eventNext()` line 1840-1848 (step 2 block): ADD location validation. After the `if (!date || !time)` check, add `var loc = ...; if (!loc) { showToast("Location required", "error"); return; }`. Update line 1844 to `event-dot-3` (was `event-dot-3` — actually stays, since the dot for the next step is still `event-dot-3` after renumbering, which is now the description step's dot). Update line 1847 to `event-step-3` (the description step, which is now what step 2 advances to).
- `eventNext()` line 1849-1856 (current step 3 block, validates location only): REPLACE the validation with `if (!desc) { showToast("Add a description", "error"); return; }`. Update `event-dot-4` → `event-dot-4` (the review step dot — stays as 4 in the new numbering) and `event-step-4` → `event-step-4` (review, stays as 4). Add the review-population code from the current step 4 block (lines 1867-1876) at the end of this block.
- `eventNext()` line 1857-1877 (current step 4 block, validates desc and populates review): DELETE entirely. Its logic moves to the new step 3 block above.
- `eventPrev()` line 1807-1811 (current step 3 block, goes back to step 2): STAYS — still goes from description back to date/time/location.
- `eventPrev()` line 1812-1816 (current step 4 block, goes back to step 3): STAYS — still goes from review back to description.
- `eventPrev()` line 1817-1824 (current step 5 block, goes back to step 4): DELETE entirely — no more step 5.
- `resetEventForm()` line 1791: array of 5 ids → array of 4 ids: `["event-step-1", "event-step-2", "event-step-3", "event-step-4"]`
- `resetEventForm()` line 1795: array of 5 dot ids → array of 4 dot ids: `["event-dot-1", "event-dot-2", "event-dot-3", "event-dot-4"]`

### D2. Description textarea — fix flex context

Current code (`app.html:411-416`):
```html
<div class="overlay-body hidden" id="event-step-4">
  <div class="form-group" style="margin-bottom:0;display:flex;flex-direction:column;flex:1;min-height:0;">
    <label>Description <span>...</span></label>
    <textarea id="event-desc" style="flex:1;min-height:200px;resize:none;"></textarea>
  </div>
</div>
```

The `flex:1` on the inner div is meaningless because the parent `.overlay-body` is not a flex container. **Fix:** add `display:flex; flex-direction:column;` to `event-step-3` (the new id after renumbering). The inner form-group's `flex:1` will then fill the card height. The textarea's `flex:1` inside it will fill the remaining vertical space minus the label.

Also bump `min-height:200px` to `min-height:280px` so the textarea is visually larger on first paint before any flex distribution.

### D3. Review event pager — use the existing `slideTrack` + `buildDescNavHTML` pattern

The description pager pattern is already implemented and used for the home card's detail overlay (4-card modal). State arrays: `modDescPageIdx[key]`, `modDescTotal[key]`, `modDescFullText[key]` (already declared at `app.ts:20-22`). Helper functions:
- `splitTextToPages(text, w, h)` — exists
- `buildModDescPagesHTML(key, pages)` — exists at `app.ts:1059-1067` (currently UNUSED in the in-card body, only used in the mod detail overlay)
- `buildModDescNavHTML(key)` — exists at `app.ts:1069-1076` (same)
- `slideTrack("mod-desc-track-" + key, page, total)` — exists at `app.ts:703-706`
- Action handlers `mod-desc-prev` / `mod-desc-next` — exist at `app.ts:2003-2018`

**Wiring:** In `renderModCard` (line 970+), when the rendered item is a *review* (i.e., we're rendering the wizard's step-4 review preview, NOT the mod card), replace the inline CSS scroll with the pager. The wizard's review is rendered into `event-review-desc-preview` (`app.html:422`), NOT through `renderModCard`. So this is a different code path: the wizard's `eventNext()` step 3→4 transition calls a `renderEventReview()` function (or similar) — need to confirm exact location by reading `app.ts` for the function that populates `#event-review-desc-preview`.

When desc is short (< 100 chars), the pager is hidden (return empty nav HTML, same pattern as `buildDescNavHTML` at `app.ts:751`).

**Critical: This is the FOURTH attempt.** Prior attempts used `overflow-x:auto; white-space:nowrap;` and similar CSS tricks. The user has been very clear that the result does not work. We MUST use explicit buttons, not CSS scroll.

### D4. Mod pending Details button — fix `showModEventDetails` lookup

`showModEventDetails(id)` at `app.ts:1315-1399` line 1318 looks up the event ONLY in `modItems["published"]`:
```ts
var item = modItems["published"]?.find(...);
```

**Fix:** Try pending first, then published:
```ts
var item = modItems["pending"]?.find((e) => e.id === id) || modItems["published"]?.find((e) => e.id === id);
```

Add a "Details" button to the pending actions row (line 1036-1039 of `app.ts`). The new actions row becomes 3 equal-flex buttons:
```html
<button class="btn btn-white btn-action btn-view-mod-details" data-action="view-mod-details" data-id="{id}" style="flex:1;">👁️ Details</button>
<button class="btn btn-green btn-action btn-approve-event" data-action="approve-event" data-id="{id}" style="flex:1;">✅ Approve</button>
<button class="btn btn-white btn-action btn-decline-event" data-action="decline-event" data-id="{id}" style="flex:1;">🗑️ Decline</button>
```

Mobile: the row uses `display:flex; gap:8px;` — on narrow screens the 3 buttons may crowd. Allow `flex-wrap: wrap` so it wraps to 2 rows if needed. Keep button text short ("Details", "Approve", "Decline") so each is ~80px wide on a 360px viewport.

### D5. Mod pending Days Overdue badge

In `renderModCard` around line 1004, when `tab === "pending"` and `item.submittedAt` is set, compute:
```ts
var submittedAtMs = new Date(item.submittedAt).getTime();
var daysOld = Math.floor((Date.now() - submittedAtMs) / 86400000);
```

Display rules:
- `daysOld === 0` → no badge (just submitted, no need to flag)
- `daysOld === 1` → "⏰ 1 day pending" (amber background)
- `daysOld >= 2` → "⏰ N days pending" (red background; redder the older)

Place the badge INLINE with the category badge, inside the new flex row container created in D6 (or a separate row if no category).

### D6. Mod published + pending — flatten badge row

Current code (lines 1004-1018 of `app.ts`):
```ts
if (tab !== "pitches" && item.category) { headerHtml += '<div style="margin-bottom:6px;">' + catBadge(item.category) + '</div>'; }
if (tab === "published") { /* rsvp badge as its own div */ }
if (tab !== "pitches") { /* past event badge as its own div */ }
```

**Refactor:** Build a `badges` string, then wrap in one flex container:
```ts
var badges = '';
if (tab !== "pitches" && item.category) badges += catBadge(item.category);
if (tab === "pending" && item.submittedAt) {
  var daysOld = Math.floor((Date.now() - new Date(item.submittedAt).getTime()) / 86400000);
  if (daysOld >= 1) {
    var daysBg = daysOld === 1 ? "#ffaa00" : "#ff4444";
    var daysLabel = "⏰ " + daysOld + " day" + (daysOld !== 1 ? "s" : "") + " pending";
    badges += '<div style="font-size:11px;font-weight:700;color:#fff;background:' + daysBg + ';border:var(--border);padding:2px 8px;display:inline-block;">' + daysLabel + '</div>';
  }
}
if (tab === "published") {
  var rc = item.rsvpCount || 0;
  var badgeColor = rc === 0 ? "#ff4444" : (rc < 5 ? "#ffaa00" : "#00ff88");
  var badgeText = rc === 0 ? "🔴 No RSVPs" : (rc < 5 ? "🟡 " + rc + " going" : "🟢 " + rc + " going");
  badges += '<div style="font-size:11px;font-weight:700;color:#fff;background:' + badgeColor + ';border:var(--border);padding:2px 8px;display:inline-block;">' + badgeText + '</div>';
}
if (tab !== "pitches") {
  var today2 = new Date().toISOString().split("T")[0] || "";
  if (item.date < today2) badges += '<div style="font-size:11px;font-weight:700;color:#fff;background:#999;border:var(--border);padding:2px 8px;display:inline-block;">⏰ Past Event</div>';
}
if (badges) headerHtml += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;align-items:center;">' + badges + '</div>';
```

**Visual change:** badges now sit on a single line when they fit; wrap to multiple lines on narrow screens. Gap between badges = 6px (was 0).

### D7. Mod pitches card — paginated description in in-card body

`renderModCard` with `tab === "pitches"` currently shows a 120-char description snippet in a vertical-scroll div (lines 1026-1030).

**Replace with paginated version** when `desc.length > 100`:
```ts
var dcKey = "pitches-" + item.id;
modDescFullText[dcKey] = desc;
var pages = splitTextToPages(desc, cardWidth, cardHeight);
modDescTotal[dcKey] = pages.length;
modDescPageIdx[dcKey] = 0;
var bodyHtml = '<div style="flex:1;min-height:0;position:relative;overflow:hidden;">' +
  '<div id="mod-desc-track-' + dcKey + '" style="display:flex;width:' + (pages.length * 100) + '%;height:100%;transition:transform 0.25s ease;will-change:transform;">' +
  pages.map(function (p, i) { return '<div style="width:' + (100 / pages.length) + '%;height:100%;overflow-y:auto;padding:8px 10px;background:#fff;border:var(--border);font-size:14px;line-height:1.45;white-space:pre-wrap;word-break:break-word;box-sizing:border-box;">' + escapeHtml(p) + '</div>'; }).join('') +
  '</div></div>' +
  '<div style="flex-shrink:0;margin-top:6px;">' + buildModDescNavHTML(dcKey) + '</div>';
```

For `desc.length <= 100`, keep the existing simple snippet — no pager needed.

### D8. Mod dashboard tab state sync bug — 3-line fix

Current code (`app.ts:936`):
```ts
function showModDashboard() { openOverlay("mod-screen"); delete modTabCache["published"]; delete modTabCache["pitches"]; loadModTab("pending"); }
```

**Fixed:**
```ts
function showModDashboard() {
  log("showModDashboard resetting active class to pending (was " + modTab + ")");
  openOverlay("mod-screen");
  modTab = "pending";
  document.querySelectorAll("#mod-tabs .mod-tab").forEach(function (t) {
    t.classList.toggle("active", (t as HTMLElement).dataset.mtab === "pending");
  });
  delete modTabCache["published"];
  delete modTabCache["pitches"];
  loadModTab("pending");
}
```

This mirrors what `switchModTab()` does on lines 937-942 but applies it to "pending" specifically. Does NOT introduce localStorage persistence (out of scope per D9).

### D9. Home card countdown — explicit math + new keyframe

In `renderHomeCard` (`app.ts:315-334`), after computing `relDate` and `dateStr`, compute hours-to-go:
```ts
var hoursToGo: number | null = null;
if (event._date && event.time) {
  var eventStart = new Date(event._date + "T" + event.time + ":00").getTime();
  var diffH = (eventStart - Date.now()) / 3600000;
  if (diffH > 0 && diffH <= 24) hoursToGo = diffH;
}
```

If `hoursToGo !== null`, replace the existing right-aligned `<span>` (line 328) with a new one wrapped in a `.countdown-blink` class:
```ts
if (hoursToGo !== null) {
  var hoursLabel = hoursToGo < 1 
    ? "⏰ <1 hr to go" 
    : (hoursToGo < 10 ? "⏰ " + Math.ceil(hoursToGo) + " hrs to go" : "⏰ " + Math.round(hoursToGo) + " hrs to go");
  rightHtml = '<span class="countdown-blink" style="font-size:11px;font-weight:700;color:#ff4444;text-align:right;flex-shrink:0;background:#fff3f3;padding:3px 7px;border:1px solid #ff4444;">' + hoursLabel + '</span>';
} else {
  rightHtml = '<span style="font-size:11px;font-weight:700;color:var(--muted);text-align:right;flex-shrink:0;">' + escapeHtml(relDate) + (relDate === "Today" || relDate === "Tomorrow" ? "<br>" + dateStr : "") + '</span>';
}
```

**New CSS in `app.html`** (added inside the existing `<style>` block):
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

**Accessibility:** The `prefers-reduced-motion: reduce` block at `app.html:250-253` already kills animations universally via `*, *::before, *::after { animation-duration: 0.01ms !important; }`. The explicit `.countdown-blink { animation: none !important; }` in the media query is belt-and-suspenders. Opacity-only blink is safer than color-flip or scale (no seizure trigger).

**Naive timezone:** The new Date parsing treats `event.date + "T" + event.time + ":00"` as local time. The `appTimezone` (set on init) is for display formatting only. Same pattern used by `formatTimeWithTz`. If events cross timezones (rare for a small community), the countdown may be off by hours — acceptable per D9.

## Risks

| Risk | Mitigation |
|---|---|
| Submit form loses data on card renumber (D1) | All field ids preserved; renumber cards only, not field ids |
| Description pager doesn't trigger on first paint (D3, D7) | Use `setTimeout(..., 0)` after DOM insert to read container dimensions (same pattern as existing `showEventDetails` at `app.ts:851-860`) |
| Mod pending event has no `rsvpCount` (D4) | `showModEventDetails` reads `rsvpCount || 0` and renders "🔴 No RSVPs" — safe |
| Days Overdue badge shows "0 days pending" for fresh submissions (D5) | Guard: only show badge if `daysOld >= 1` |
| Blinking animation annoys users (D9) | `prefers-reduced-motion` honored; opacity-only (no flash) |
| Tab sync fix breaks the "remember last tab" use case (D8) | Out of scope — current behavior doesn't persist last tab; no regression |
| Card-body pager for pitches breaks the existing card-body style (D7) | When `desc.length > 100`, replace the existing 120-char snippet block with the pager — same parent flex context |
| Edit-event flow uses the same wizard (D1) | The same wizard is used for both create and edit (`app.ts:1789`); the renumber applies to both flows automatically |

## Cross-cutting changes summary

- `app.html` — inline CSS additions: `.countdown-blink` + `@keyframes blinkPulse` + media query rule. HTML structure changes: 5 submit cards → 4 (with moved location/maps fields), and the description card's parent gets `display:flex; flex-direction:column;`
- `app.ts` — `renderModCard` (D5, D6, D7), `showModDashboard` (D8), `renderHomeCard` (D9), `eventNext`/`eventPrev`/`resetEventForm` (D1), `showModEventDetails` lookup (D4)
- No server changes
- No new dependencies
- No new translation strings
