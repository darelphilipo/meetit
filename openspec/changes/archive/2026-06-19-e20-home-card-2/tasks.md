# Tasks: e20 Home Card 2.0

## 1. Add CSS for card-swap animation

In `public/app.html`, add after the existing `@keyframes blinkPulse` block (around line 122):

```css
@keyframes cardSwapInFromLeft {
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes cardSwapInFromRight {
  from { transform: translateX(20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.card-swap-prev { animation: cardSwapInFromLeft 200ms ease-out; }
.card-swap-next { animation: cardSwapInFromRight 200ms ease-out; }
```

## 2. Add category accent stripe in renderHomeCard

In `src/client/app.ts`, find `renderHomeCard()` (around line 330). The `s2` variable builds the card HTML. Add the accent stripe as a left border on the card-shell.

Find `buildCardShell` call at line 410 (or near it):
```ts
c.innerHTML = buildCardShell({ headerHtml: headerHtml, bodyHtml: bodyHtml, actionsHtml: actionsHtml, footerHtml: footerHtml, noFade: opts.noFade });
```

Replace with a version that adds the accent stripe style. Find the category color from CAT_MAP:
```ts
var catColor = (event.category && CAT_MAP[event.category]) ? CAT_MAP[event.category].color : "";
var shellStyle = catColor ? ' style="border-left:6px solid ' + catColor + ';"' : '';
c.innerHTML = buildCardShell({ headerHtml: headerHtml, bodyHtml: bodyHtml, actionsHtml: actionsHtml, footerHtml: footerHtml, noFade: opts.noFade }).replace('<div class="card-shell', '<div class="card-shell' + (catColor ? ' card-shell--accented' : '') + '"' + (catColor ? shellStyle.replace(' style="', ' style="border-left:6px solid ' + catColor + ';') : ''));
```

Wait, that's overcomplicated. Simpler approach: just inline the style directly into the buildCardShell call by using a wrapper. Or modify the `s2` variable that builds the card body.

Cleanest approach: don't modify buildCardShell at all. Instead, change the existing buildCardShell call to pass a className and let the buildCardShell add the inline style. The cleanest path:

Modify `buildCardShell` in `app.ts` (line 210) to accept an optional `accentColor` and add it to the style:
```ts
function buildCardShell(opts: { color?: string; headerHtml: string; bodyHtml: string; actionsHtml?: string; footerHtml?: string; className?: string; noFade?: boolean; accentColor?: string }): string {
  log("buildCardShell" + (opts.className ? " class=" + opts.className : "") + (opts.noFade ? " noFade" : "") + (opts.accentColor ? " accent=" + opts.accentColor : ""));
  var cls = "card-shell";
  if (!opts.noFade) cls += " fade-in";
  if (opts.className) cls += " " + opts.className;
  var styleParts: string[] = [];
  if (opts.color) styleParts.push("background:" + opts.color);
  if (opts.accentColor) styleParts.push("border-left:6px solid " + opts.accentColor);
  var styleStr = styleParts.length > 0 ? ' style="' + styleParts.join(";") + ';"' : '';
  return '<div class="' + cls + '"' + styleStr + '>' +
    '<div class="card-shell-header">' + opts.headerHtml + '</div>' +
    '<div class="card-shell-body">' + opts.bodyHtml + '</div>' +
    (opts.actionsHtml ? '<div class="card-shell-actions">' + opts.actionsHtml + '</div>' : '') +
    (opts.footerHtml ? '<div class="card-shell-footer">' + opts.footerHtml + '</div>' : '') +
    '</div>';
}
```

In `renderHomeCard`, pass `accentColor`:
```ts
var catColor = (event.category && CAT_MAP[event.category]) ? CAT_MAP[event.category].color : "";
// ... existing code ...
c.innerHTML = buildCardShell({ headerHtml: headerHtml, bodyHtml: bodyHtml, actionsHtml: actionsHtml, footerHtml: footerHtml, noFade: opts.noFade, accentColor: catColor });
```

## 3. Bump title to 22px in renderHomeCard

Find the home card title in `renderHomeCard`:
```ts
'<h3 class="card-title-lg" style="overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">' + escapeHtml(event.title) + '</h3>'
```

Replace `class="card-title-lg"` with `style="font-size:22px;font-weight:700;line-height:1.25;margin:0;word-break:break-word;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;"` — wait, that's reverting the e21 class change. We need to either:
- Bump the `.card-title-lg` class in app.html from 18px to 22px (affects mod card too — out of scope), OR
- Override just for the home card

Better: keep `.card-title-lg` at 18px (the mod card still uses it at 18px). Add a new class `.card-title-hero`:
```css
.card-title-hero { font-size: 22px; font-weight: 700; line-height: 1.25; margin: 0; word-break: break-word; }
```

In renderHomeCard, use `class="card-title-hero"` instead of `class="card-title-lg"`.

Update organizer meta: find `style="font-size:12px;color:var(--muted);font-weight:600;margin-top:2px;"` and bump to 13px.

## 4. Bump emoji tile to 56px

Find the emoji tile block:
```ts
(event.emoji ? '<div style="width:40px;height:40px;background:var(--primary);border:var(--border);display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:var(--shadow-sm);flex-shrink:0;">' + event.emoji + '</div>' : '<div style="width:40px;height:40px;background:var(--surface);border:var(--border);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;box-shadow:var(--shadow-sm);flex-shrink:0;">📅</div>')
```

Replace `width:40px;height:40px` with `width:56px;height:56px` and `font-size:22px` with `font-size:32px` (emoji), `font-size:16px` with `font-size:22px` (fallback 📅).

Cleaner: extract the inline style to a CSS class `.emoji-tile` in app.html:
```css
.emoji-tile { width: 56px; height: 56px; background: var(--primary); border: var(--border); display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: var(--shadow-sm); flex-shrink: 0; }
.emoji-tile--fallback { background: var(--surface); font-size: 22px; font-weight: 700; }
```

In renderHomeCard:
```ts
(event.emoji ? '<div class="emoji-tile">' + event.emoji + '</div>' : '<div class="emoji-tile emoji-tile--fallback">📅</div>')
```

## 5. Asymmetric button sizing

Find the actionsHtml in renderHomeCard:
```ts
var actionsHtml =
  '<div style="display:flex;gap:6px;align-items:center;">' +
  '<button class="btn btn-white btn-action btn-view-details" data-id="' + event.id + '" data-action="view-details">Details →</button>' +
  (event.hasRsvped
    ? '<button class="btn btn-green btn-action btn-rsvp-card" data-id="' + event.id + '" data-action="rsvp-card">✅ Going</button>'
    : '<button class="btn btn-pink btn-action btn-rsvp-card" data-id="' + event.id + '" data-action="rsvp-card">🎟️ RSVP</button>') +
  (homeShareUrl ? '<button class="btn btn-white btn-icon btn-share-event" data-action="share-event" title="Copy share link" aria-label="Copy share link">📤</button>' : '') +
  '</div>';
```

Add `style="flex:1;"` to Details, `style="flex:2;"` to RSVP. Add `flex-wrap: wrap` to the container to handle narrow viewports.

```ts
var actionsHtml =
  '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
  '<button class="btn btn-white btn-action btn-view-details" data-id="' + event.id + '" data-action="view-details" style="flex:1;min-width:0;">Details →</button>' +
  (event.hasRsvped
    ? '<button class="btn btn-green btn-action btn-rsvp-card" data-id="' + event.id + '" data-action="rsvp-card" style="flex:2;min-width:0;">✅ Going</button>'
    : '<button class="btn btn-pink btn-action btn-rsvp-card" data-id="' + event.id + '" data-action="rsvp-card" style="flex:2;min-width:0;">🎟️ RSVP</button>') +
  (homeShareUrl ? '<button class="btn btn-white btn-icon btn-share-event" data-action="share-event" title="Copy share link" aria-label="Copy share link">📤</button>' : '') +
  '</div>';
```

Bumped gap from 6px to 8px for better visual breathing room (matches the new 44px button height).

## 6. Add "LIVE NOW" state

Find the rightHtml logic in renderHomeCard (around line 360-368):
```ts
var rightHtml = '';
if (hoursToGo !== null) {
  var hoursLabel = hoursToGo < 1
    ? "⏰ <1 hr to go"
    : (hoursToGo < 10 ? "⏰ " + Math.ceil(hoursToGo) + " hrs to go" : "⏰ " + Math.round(hoursToGo) + " hrs to go");
  rightHtml = '<span class="countdown-blink" style="font-size:11px;font-weight:700;color:var(--danger);text-align:right;flex-shrink:0;background:var(--danger-bg);padding:3px 7px;border:3px solid var(--danger);">' + hoursLabel + '</span>';
} else {
  rightHtml = '<span style="font-size:11px;font-weight:700;color:var(--muted);text-align:right;flex-shrink:0;">' + escapeHtml(relDate) + (relDate === "Today" || relDate === "Tomorrow" ? "<br>" + dateStr : "") + '</span>';
}
```

Add a new `liveNow` boolean computed from `hoursToGo`:
```ts
var liveNow = false;
if (event._date && event.time) {
  var eventStart2 = new Date(event._date + "T" + event.time + ":00").getTime();
  var minutesToGo = (eventStart2 - Date.now()) / 60000;
  if (minutesToGo > 0 && minutesToGo <= 30) liveNow = true;
}
if (liveNow) log("renderHomeCard liveNow=true minutesToGo=" + minutesToGo);
```

Then update the rightHtml branch order:
```ts
var rightHtml = '';
if (liveNow) {
  rightHtml = '<span class="countdown-blink" style="font-size:11px;font-weight:700;color:var(--danger);text-align:right;flex-shrink:0;background:var(--danger-bg);padding:3px 7px;border:3px solid var(--danger);">🔴 LIVE NOW</span>';
} else if (hoursToGo !== null) {
  var hoursLabel = hoursToGo < 1
    ? "⏰ <1 hr to go"
    : (hoursToGo < 10 ? "⏰ " + Math.ceil(hoursToGo) + " hrs to go" : "⏰ " + Math.round(hoursToGo) + " hrs to go");
  rightHtml = '<span class="countdown-blink" style="font-size:11px;font-weight:700;color:var(--danger);text-align:right;flex-shrink:0;background:var(--danger-bg);padding:3px 7px;border:3px solid var(--danger);">' + hoursLabel + '</span>';
} else {
  rightHtml = '<span style="font-size:11px;font-weight:700;color:var(--muted);text-align:right;flex-shrink:0;">' + escapeHtml(relDate) + (relDate === "Today" || relDate === "Tomorrow" ? "<br>" + dateStr : "") + '</span>';
}
```

Extract the badge HTML to a small inline helper to avoid duplication. Actually, it's only 2 sites — keep inline for clarity.

## 7. Card-swap slide animation in homePrev/homeNext

Find `homePrev()` and `homeNext()` (around line 416-417):

Current:
```ts
function homePrev() { var events = searchFilteredEvents || cachedHomeEvents; log("homePrev idx=" + homeCardIdx + " total=" + events.length); if (events.length > 1) { homeCardIdx = (homeCardIdx - 1 + events.length) % events.length; log("homePrev newIdx=" + homeCardIdx); renderHomeCard({ eventsByDate: groupByDate(events), isMod: cachedHomeIsMod, settings: {} }, { noFade: true }); } }
function homeNext() { var events = searchFilteredEvents || cachedHomeEvents; log("homeNext idx=" + homeCardIdx + " total=" + events.length); if (events.length > 1) { homeCardIdx = (homeCardIdx + 1) % events.length; log("homeNext newIdx=" + homeCardIdx); renderHomeCard({ eventsByDate: groupByDate(events), isMod: cachedHomeIsMod, settings: {} }, { noFade: true }); } }
```

Modify to pass a `cardSwap` direction:
```ts
function homePrev() { var events = searchFilteredEvents || cachedHomeEvents; log("homePrev idx=" + homeCardIdx + " total=" + events.length); if (events.length > 1) { homeCardIdx = (homeCardIdx - 1 + events.length) % events.length; log("homePrev newIdx=" + homeCardIdx); renderHomeCard({ eventsByDate: groupByDate(events), isMod: cachedHomeIsMod, settings: {} }, { noFade: true, cardSwap: "prev" }); } }
function homeNext() { var events = searchFilteredEvents || cachedHomeEvents; log("homeNext idx=" + homeCardIdx + " total=" + events.length); if (events.length > 1) { homeCardIdx = (homeCardIdx + 1) % events.length; log("homeNext newIdx=" + homeCardIdx); renderHomeCard({ eventsByDate: groupByDate(events), isMod: cachedHomeIsMod, settings: {} }, { noFade: true, cardSwap: "next" }); } }
```

In `renderHomeCard`, accept the `cardSwap` option and add the class:
```ts
function renderHomeCard(state: ..., opts: { noFade?: boolean; cardSwap?: "prev" | "next" } = {}) {
  // ... existing code ...
  c.innerHTML = buildCardShell({ ..., noFade: opts.noFade, accentColor: catColor });
  if (opts.cardSwap) {
    var shell = c.querySelector(".card-shell") as HTMLElement | null;
    if (shell) {
      shell.classList.add(opts.cardSwap === "prev" ? "card-swap-prev" : "card-swap-next");
      setTimeout(function () { shell.classList.remove("card-swap-prev", "card-swap-next"); }, 250);
    }
  }
  // ... rest
}
```

Note: `setTimeout(..., 250)` — 50ms safety margin over the 200ms animation.

## 8. Verify

- `npx tsc --noEmit` — no new TS errors
- `npm run build` — must build clean
- `npm test` — all 10 tests pass
- Visual: home card has visible category-color left border (purple for Tech, orange for Food, etc.)
- Visual: title is 22px (was 18px), emoji tile is 56px (was 40px)
- Visual: RSVP button is ~2× the width of Details button
- Functional: an event with start time 25 minutes in the future shows "🔴 LIVE NOW" badge
- Functional: clicking Next triggers a slide-in from the right
- Functional: clicking Prev triggers a slide-in from the left
