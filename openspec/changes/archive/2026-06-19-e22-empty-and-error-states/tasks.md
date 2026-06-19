# Tasks: e22 Empty & Error States

## 1. Add helpers in `src/client/app.ts`

Add three helpers near the existing `confirmDestructive()` (around line 1286). All take an `opts` object and return a string of HTML (the empty/error/skeleton card).

### 1a. `renderEmptyState(opts)`

```ts
function renderEmptyState(opts: {
  emoji: string;
  title: string;
  body?: string;
  ctas?: Array<{ label: string; action: string; variant: "pink" | "white" | "green" }>;
  compact?: boolean;
  context?: string;
}): string {
  log("renderEmptyState context=" + (opts.context || "custom") + " emoji=" + opts.emoji);
  var cls = opts.compact ? "empty-state compact" : "empty-state";
  var html = '<div class="' + cls + '"><span class="emoji">' + opts.emoji + '</span>' +
    '<h2>' + escapeHtml(opts.title) + '</h2>' +
    (opts.body ? '<p>' + escapeHtml(opts.body) + '</p>' : '');
  if (opts.ctas && opts.ctas.length > 0) {
    html += '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px;">';
    for (var i = 0; i < opts.ctas.length; i++) {
      var cta = opts.ctas[i]!;
      var bg = cta.variant === "pink" ? "btn-pink" : (cta.variant === "green" ? "btn-green" : "btn-white");
      html += '<button class="btn ' + bg + ' btn-empty" data-action="' + escapeAttr(cta.action) + '">' + cta.label + '</button>';
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}
```

### 1b. `renderErrorState(opts)`

```ts
function renderErrorState(opts: {
  message: string;
  retryAction?: string;
  compact?: boolean;
}): string {
  log("renderErrorState message=" + opts.message + (opts.retryAction ? " retry=" + opts.retryAction : " no-retry"));
  var cls = opts.compact ? "empty-state compact" : "empty-state";
  var html = '<div class="' + cls + '"><span class="emoji">😿</span>' +
    '<h2>' + escapeHtml(opts.message) + '</h2>' +
    (opts.retryAction ? '<button class="btn btn-white btn-empty" data-action="' + escapeAttr(opts.retryAction) + '">🔄 Tap to retry</button>' : '') +
    '</div>';
  return html;
}
```

### 1c. `renderSkeleton(opts)`

```ts
function renderSkeleton(opts: { bars?: number; compact?: boolean } = {}): string {
  var n = opts.bars || 3;
  log("renderSkeleton bars=" + n + (opts.compact ? " compact" : ""));
  var cls = opts.compact ? "empty-state compact" : "empty-state";
  var html = '<div class="' + cls + '" style="padding-top:24px;">';
  for (var i = 0; i < n; i++) {
    var w = 100 - (i * 15);  // taper the bars
    html += '<div class="skeleton-bar" style="width:' + w + '%;"></div>';
  }
  html += '</div>';
  return html;
}
```

## 2. Add CSS for skeleton + required marker

In `public/app.html`, add after the existing `@keyframes` block (around line 122):

```css
@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
.skeleton-bar {
  background: linear-gradient(90deg, var(--surface) 0%, var(--outline-v) 50%, var(--surface) 100%);
  background-size: 200px 100%;
  animation: shimmer 1.4s linear infinite;
  height: 16px;
  margin-bottom: 10px;
  border: var(--border);
}
.req { color: var(--secondary); font-weight: 700; }
.form-error { color: var(--danger); font-size: 12px; font-weight: 600; margin-top: 4px; }
.form-group.has-error input,
.form-group.has-error textarea,
.form-group.has-error select { box-shadow: 0 0 0 3px var(--danger); }
```

The existing `prefers-reduced-motion` media query at line 258-261 already covers `*` animations, so the shimmer auto-disables.

## 3. Add `validateField()` helper in `app.ts`

After `renderErrorState` / `renderSkeleton`:

```ts
function validateField(el: HTMLElement, message: string): boolean {
  var group = el.closest(".form-group");
  if (!group) return true;
  // Remove existing error
  var existing = group.querySelector(".form-error");
  if (existing) existing.remove();
  group.classList.remove("has-error");
  if (!message) return true;
  group.classList.add("has-error");
  var err = document.createElement("div");
  err.className = "form-error";
  err.textContent = message;
  el.insertAdjacentElement("afterend", err);
  return false;
}
```

Add a `clearFieldError(el)` companion that calls `validateField(el, "")` to reset state.

## 4. Migrate empty-state sites

Replace each of the 11 inline empty-state strings with a call to `renderEmptyState()`.

**4a. Home (line 336):**
```ts
c.innerHTML = renderEmptyState({
  emoji: "🐱", title: "Wow, so empty!",
  body: "No events yet — be the first spark ✨",
  ctas: [
    { label: "💡 Pitch Idea", action: "create-pitch", variant: "pink" },
    { label: "📋 Submit Event", action: "create-event", variant: "white" },
  ],
  context: "home",
});
```

**4b. Search filter (line 442):**
```ts
c.innerHTML = renderEmptyState({
  emoji: "🔍", title: "Nothing matches that vibe",
  body: "No events match \"" + query + "\". Try a different filter.",
  context: "filter",
});
```

**4c. My Stuff → RSVPs (line 539):**
```ts
el.innerHTML = renderEmptyState({
  emoji: "🎟️", title: "No RSVPs yet",
  body: "Browse the Home tab to find your people ✨",
  ctas: [{ label: "← Back to Home", action: "close-overlay", variant: "white" }],
  compact: true, context: "my-stuff-rsvps",
});
```

**4d. My Stuff → Pitches (line 582):**
```ts
el.innerHTML = renderEmptyState({
  emoji: "💡", title: "No pitches yet",
  body: "Got an idea? Pitch it from the Create menu.",
  ctas: [{ label: "💡 Pitch an Idea", action: "create-pitch", variant: "pink" }],
  compact: true, context: "my-stuff-pitches",
});
```

**4e. My Stuff → Events (line 623):**
```ts
el.innerHTML = renderEmptyState({
  emoji: "📋", title: "No events yet",
  body: "Submit an event from the Create menu!",
  ctas: [{ label: "📋 Submit Event", action: "create-event", variant: "white" }],
  compact: true, context: "my-stuff-events",
});
```

**4f. Inline attendees (line 712):** the existing raw `<div style="text-align:center;...">` is replaced with:
```ts
el.innerHTML = renderEmptyState({
  emoji: "👥", title: "No one yet — be the first!",
  compact: true, context: "rsvp-list",
});
```

**4g. Mod → Pending (line 1216):**
```ts
document.getElementById("pending-events-container")!.innerHTML = renderEmptyState({
  emoji: "📋", title: "No pending events",
  body: "Nothing to review right now.",
  context: "mod-pending",
});
```

**4h. Mod → Published (line 1230):**
```ts
document.getElementById("pending-events-container")!.innerHTML = renderEmptyState({
  emoji: "✅", title: "No published events",
  body: "Approved events will appear here.",
  context: "mod-published",
});
```

**4i. Mod → Pitches (line 1242):**
```ts
document.getElementById("pending-events-container")!.innerHTML = renderEmptyState({
  emoji: "💡", title: "No pitched ideas",
  body: "Community pitches will appear here.",
  context: "mod-pitches",
});
```

**4j. RSVP list in details (line 1635):**
```ts
container.innerHTML = renderEmptyState({
  emoji: "🎟️", title: "No RSVPs yet",
  compact: true, context: "rsvp-list",
});
```

**4k. Mod attendees (line 1697):**
```ts
body.innerHTML = renderEmptyState({
  emoji: "👥", title: "No RSVPs yet",
  compact: true, context: "attendees",
});
```

## 5. Migrate error sites

**5a. loadHome catch (line 295):** replace the silent update with a visible error state. Keep the existing `loading-msg` update for the loading-screen, but also write a card into `events-container`:

```ts
} catch (e) {
  log("error: loadHome " + e);
  if (msg) msg.textContent = "Couldn't load events";
  var evC = document.getElementById("events-container");
  if (evC) evC.innerHTML = renderErrorState({ message: "Couldn't load events", retryAction: "refresh-home" });
}
```

**5b. loadMySubmissions catch (line 530):**
```ts
container.innerHTML = renderErrorState({ message: "Couldn't load My Stuff", retryAction: "open-my-stuff" });
```

**5c. Mod attendees catch (line 1735):**
```ts
body.innerHTML = renderErrorState({ message: "Couldn't load attendees", retryAction: "view-attendees-mod" });
```

**5d. loadModTab catch (line 1038):** add a visible error state:
```ts
} catch (e) {
  log("error: loadModTab " + e);
  document.getElementById("pending-events-container")!.innerHTML = renderErrorState({
    message: "Couldn't load mod queue", retryAction: "show-mod"
  });
}
```

**5e. Event details fetch fail (line 870):** replace the silent fallback with an error state:
```ts
} catch (e) {
  log("error: showEventDetails " + e);
  var body3 = document.getElementById("detail-body");
  if (body3) body3.innerHTML = renderErrorState({ message: "Couldn't load event", retryAction: "close-overlay" });
  // Hide footer back/next since there's no event to navigate
  document.getElementById("detail-prev-btn")?.classList.add("hidden");
  document.getElementById("detail-next-btn")?.classList.add("hidden");
  return;
}
```

**5f. Silent failures (lines 748, 1627, 1785):** keep behavior but add a `showToast("Couldn't load", "error")` so the user knows something failed. (This is the minimum bar for an error state.)

## 6. Migrate loading sites

**6a. loadMySubmissions initial (line 516):**
```ts
container.innerHTML = renderSkeleton({ bars: 4 });
```

**6b. Attendees in details (line 1611):**
```ts
if (container) container.innerHTML = renderSkeleton({ bars: 3, compact: true });
```

**6c. Mod attendees (line 1683):**
```ts
body.innerHTML = renderSkeleton({ bars: 3, compact: true });
```

## 7. Add required-field markers to `app.html`

For each of these lines, change `<label>Field</label>` to `<label>Field <span class="req">*</span></label>`:

- Line 395 (pitch title)
- Line 396 (pitch description)
- Line 417 (event title)
- Line 439 (event date)
- Line 440 (event time)
- Line 442 (event location)

For the event description textarea (step 3, line 419), the label currently is `<label>Description <span style="color:var(--muted);font-weight:500;font-size:11px;">(longer is fine — full page)</span></label>`. Change to: `<label>Description <span class="req">*</span> <span style="color:var(--muted);font-weight:500;font-size:11px;">(longer is fine — full page)</span></label>`

## 8. Refactor eventNext validation to use inline errors

In `eventNext()` (line 1962 onwards), replace the `showToast` calls with `validateField` calls:

```ts
if (eventStep === 1) {
  var title = (document.getElementById("event-title") as HTMLInputElement).value.trim();
  var org = (document.getElementById("event-organizer") as HTMLInputElement).value.trim();
  var cat = (document.getElementById("event-category") as HTMLSelectElement).value;
  var titleEl = document.getElementById("event-title")!;
  var orgEl = document.getElementById("event-organizer")!;
  var catEl = document.getElementById("event-category")!;
  validateField(titleEl, "");
  validateField(orgEl, "");
  validateField(catEl, "");
  var titleOk = validateField(titleEl, title ? "" : "Title is required");
  var orgOk = validateField(orgEl, org ? "" : "Organizer is required");
  var catOk = validateField(catEl, cat ? "" : "Pick a category");
  if (!titleOk || !orgOk || !catOk) { showToast("Fix the highlighted fields", "error"); return; }
  // ... rest unchanged
}
```

Same pattern for `eventStep === 2`:
- Validate `event-date`, `event-time`, `event-location` (all required)
- Show inline errors instead of toasting

## 9. Refactor submitEvent validation to use inline errors

At `submitEvent()` (line 2056):
```ts
if (!title || !organizer || !date || !time || !loc || !desc) {
  validateField(document.getElementById("event-title")!, title ? "" : "Title is required");
  validateField(document.getElementById("event-organizer")!, organizer ? "" : "Organizer is required");
  validateField(document.getElementById("event-date")!, date ? "" : "Date is required");
  validateField(document.getElementById("event-time")!, time ? "" : "Time is required");
  validateField(document.getElementById("event-location")!, loc ? "" : "Location is required");
  validateField(document.getElementById("event-desc")!, desc ? "" : "Description is required");
  showToast("Fix the highlighted fields", "error");
  unlock("submit-event");
  return;
}
```

## 10. Verify

- `npx tsc --noEmit` — no new TS errors
- `npm run build` — must build clean
- `npm test` — all 10 tests pass
- Each of the 11 empty states still shows the same emoji + title + body + CTAs
- Each error state now has a "🔄 Tap to retry" button
- Each loading state now has a 3-4 bar skeleton with shimmer
- Each required field has a red `*` marker
- Submit Event with empty title now shows an inline error under the title field, AND a "Fix the highlighted fields" toast
