# Tasks: e23 Microinteractions

## 1. Add CSS for press-and-squish

In `public/app.html`, modify the existing `.btn:active` rule (line 86):

Current:
```css
.btn:active { box-shadow: 0px 0px 0 #1c1c0f; transform: translate(4px,4px); }
```

Replace with:
```css
.btn:active { box-shadow: 0px 0px 0 var(--border-color); transform: translate(4px,4px) scale(0.97); transition-duration: 80ms; }
```

Also modify the close-btn (line 145), footer-btn (line 207), and icon-btn (line 241) :active rules similarly:

```css
.close-btn:active { box-shadow: none; transform: translate(4px,4px) scale(0.97); transition-duration: 80ms; }
.footer-btn:active { box-shadow: none; transform: translate(3px,3px) scale(0.97); transition-duration: 80ms; }
.icon-btn:active { box-shadow: none; transform: translate(3px,3px) scale(0.97); transition-duration: 80ms; }
```

The existing transition is `transition: box-shadow var(--t-fast) var(--ease), transform var(--t-fast) var(--ease);` (120ms). The `:active` override sets it to 80ms, making the press feel snappier.

## 2. Add CSS for chip stagger

After the existing `.step-dot.just-pulsed` rule (around line 159), add:

```css
.event-tag { animation: fadeInUp 0.2s ease-out backwards; animation-delay: calc(var(--i, 0) * 40ms); }
```

In `src/client/app.ts`, find `renderHomeCard` and the event-tag chips (around line 408-410). Update each chip to include `style="--i:N;..."`:

Find the meta row HTML:
```ts
'<div class="event-meta" style="margin-bottom:8px;">' +
'<span class="event-tag" style="font-size:12px;padding:3px 8px;">⏰ ' + formatTimeWithTz(event.time, appTimezone) + '</span>' +
'<span class="event-tag" style="font-size:12px;padding:3px 8px;background:var(--primary);">👥 ' + (event.rsvpCount || 0) + '</span>' +
(event.category ? catBadge(event.category) : '') +
'</div>';
```

Replace with:
```ts
'<div class="event-meta" style="margin-bottom:8px;">' +
'<span class="event-tag" style="--i:0;font-size:12px;padding:3px 8px;">⏰ ' + formatTimeWithTz(event.time, appTimezone) + '</span>' +
'<span class="event-tag" style="--i:1;font-size:12px;padding:3px 8px;background:var(--primary);">👥 ' + (event.rsvpCount || 0) + '</span>' +
(event.category ? '<span style="--i:2;display:inline-flex;">' + catBadge(event.category) + '</span>' : '') +
'</div>';
```

The third chip (catBadge) is wrapped in a span with `--i:2` because the badge itself uses `display:inline-flex` but the stagger needs an inline-block-like parent to animate.

## 3. Add CSS for success checkmark draw

In `public/app.html`, add after the existing `@keyframes cardSwapInFromRight` (around line 169):

```css
@keyframes rsvpCircleDraw {
  from { stroke-dasharray: 0 151; }
  to { stroke-dasharray: 151 151; }
}
@keyframes rsvpCheckDraw {
  from { stroke-dasharray: 0 50; }
  to { stroke-dasharray: 50 50; }
}
.rsvp-checkmark-circle { stroke-dasharray: 151 151; stroke-dashoffset: 0; animation: rsvpCircleDraw 0.4s ease-out; }
.rsvp-checkmark-path { stroke-dasharray: 50 50; stroke-dashoffset: 0; animation: rsvpCheckDraw 0.3s ease-out 0.4s backwards; }
```

## 4. Replace RSVP success emoji with checkmark

In `src/client/app.ts`, find the success block at line 1000 (in `openDetailsOverlay` step 4 — the "You're on the list!" view) and line 1998 (in the post-submit update flow).

Line 1000:
```ts
'<div style="font-size:56px;">🎉</div>' +
```

Replace with:
```ts
'<svg class="rsvp-checkmark" viewBox="0 0 52 52" width="56" height="56" style="margin:0 auto;"><circle class="rsvp-checkmark-circle" cx="26" cy="26" r="24" fill="none" stroke="#1c1c0f" stroke-width="4"/><path class="rsvp-checkmark-path" fill="none" stroke="#00ff88" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" d="M14 27l7 7 16-16"/></svg>' +
```

Line 1998 — same replacement, but the surrounding code might be slightly different. Find:
```ts
'<div style="font-size:56px;">' + confirmEmoji + '</div>' +
```

Replace with:
```ts
(isUpdate ? '<div style="font-size:56px;">' + confirmEmoji + '</div>' : '<svg class="rsvp-checkmark" viewBox="0 0 52 52" width="56" height="56" style="margin:0 auto;"><circle class="rsvp-checkmark-circle" cx="26" cy="26" r="24" fill="none" stroke="#1c1c0f" stroke-width="4"/><path class="rsvp-checkmark-path" fill="none" stroke="#00ff88" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" d="M14 27l7 7 16-16"/></svg>') +
```

For updates (not the celebratory case), keep the ✅ emoji. For new RSVPs, use the checkmark.

## 5. Add CSS for RSVP bounce

After the existing `@keyframes rsvpCheckDraw`, add:

```css
@keyframes rsvpBounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
.rsvp-bounce { animation: rsvpBounce 400ms ease-out; }
```

## 6. Implement RSVP bounce with session flag

In `src/client/app.ts`, add a session-tracked Set near the other state variables (around line 27):
```ts
var justRsvpedIds: Record<string, boolean> = {};
```

Find the `submitRsvp` function or wherever the RSVP submit succeeds. After the successful API call, add:
```ts
if (currentEventId) justRsvpedIds[currentEventId] = true;
log("submitRsvp success, justRsvped=" + currentEventId);
```

(Look for the existing success branch — search for `showToast("RSVP confirmed" or "RSVP submitted".) The exact line depends on the current code structure.

In `renderHomeCard`, after the `buildCardShell` call (around line 440), add:
```ts
if (event.hasRsvped && justRsvpedIds[event.id]) {
  var rsvpBtn = c.querySelector(".btn-rsvp-card");
  if (rsvpBtn) {
    rsvpBtn.classList.add("rsvp-bounce");
    setTimeout(function() { rsvpBtn.classList.remove("rsvp-bounce"); justRsvpedIds[event.id] = false; log("rsvp-bounce done for " + event.id); }, 450);
    log("rsvp-bounce triggered for " + event.id);
  }
}
```

## 7. Add CSS for toast slide-in

After the existing `@keyframes shimmer` (around line 177), add:

```css
@keyframes toastSlideIn {
  0% { transform: translate(-50%, 100px); opacity: 0; }
  60% { transform: translate(-50%, -10px); opacity: 1; }
  100% { transform: translate(-50%, 0); opacity: 1; }
}
.toast-anim { animation: toastSlideIn 0.25s ease-out; }
```

In `src/client/app.ts`, modify `showToast()` (line 191) to add the class:

```ts
function showToast(msg: string, type: "success" | "error") {
  var t = document.createElement("div");
  t.className = "toast-anim";
  t.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:" + (type === "success" ? "#00ff88" : "#ff4444") + ";color:#1c1c0f;padding:14px 24px;font-weight:700;z-index:2000;font-family:'Space Grotesk',sans-serif;border:4px solid #1c1c0f;box-shadow:6px 6px 0 #1c1c0f;";
  t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, TOAST_DURATION);
}
```

Note: the inline style sets `transform: translateX(-50%)`. The keyframe animation overrides this with its own `transform: translate(-50%, 100px) → (-50%, 0)`. The animation runs once on append, then the inline style takes over (which is `translateX(-50%)` — the resting position).

For `showCopyToast()` (line 196), the toast uses `t.className = "toast-copied"`. Add `toast-anim` to that className too:
```ts
t.className = "toast-copied toast-anim";
```

## 8. Add CSS for countdown transform pulse

In `public/app.html`, find the existing `@keyframes blinkPulse` (line 158):
```css
@keyframes blinkPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
```

Replace with:
```css
@keyframes blinkPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

The existing `.countdown-blink` class (line 162) uses this animation. The transform requires `display: inline-block`. Find the badge HTML in renderHomeCard and add `display:inline-block` to the inline style. The badge appears in two places:

**8a. LIVE NOW badge:**
```ts
rightHtml = '<span class="countdown-blink" style="font-size:11px;font-weight:700;color:var(--danger);text-align:right;flex-shrink:0;background:var(--danger-bg);padding:3px 7px;border:3px solid var(--danger);">🔴 LIVE NOW</span>';
```

Add `display:inline-block;` to the style:
```ts
rightHtml = '<span class="countdown-blink" style="display:inline-block;font-size:11px;font-weight:700;color:var(--danger);text-align:right;flex-shrink:0;background:var(--danger-bg);padding:3px 7px;border:3px solid var(--danger);">🔴 LIVE NOW</span>';
```

**8b. Countdown badge (e21+ uses var(--danger)):**
```ts
rightHtml = '<span class="countdown-blink" style="font-size:11px;font-weight:700;color:var(--danger);text-align:right;flex-shrink:0;background:var(--danger-bg);padding:3px 7px;border:3px solid var(--danger);">' + hoursLabel + '</span>';
```

Add `display:inline-block;`:
```ts
rightHtml = '<span class="countdown-blink" style="display:inline-block;font-size:11px;font-weight:700;color:var(--danger);text-align:right;flex-shrink:0;background:var(--danger-bg);padding:3px 7px;border:3px solid var(--danger);">' + hoursLabel + '</span>';
```

## 9. Verify

Run these commands and report results:
1. `cd D:\code workspace\reddit\meetup-hub && npx tsc --noEmit` — must pass with no errors
2. `cd D:\code workspace\reddit\meetup-hub && npm run build` — must build clean
3. `cd D:\code workspace\reddit\meetup-hub && npm test` — all 10 tests must pass

### Step 10: Final sanity check

Grep to confirm:
- `grep -n "scale(0.97)" public/app.html` — 4 matches (btn, close-btn, footer-btn, icon-btn)
- `grep -n "rsvpCircleDraw\|rsvpCheckDraw" public/app.html` — 4 matches (2 keyframes + 2 .class rules)
- `grep -n "rsvpBounce" public/app.html` — 2 matches (1 keyframe + 1 .class)
- `grep -n "toastSlideIn\|toast-anim" public/app.html` — 3 matches (1 keyframe + 1 .class + the @media rule)
- `grep -n "transform: scale" public/app.html` — 3 matches (blinkPulse + rsvpBounce + 1 in btn)
- `grep -n "justRsvpedIds" src/client/app.ts` — 3 matches (declaration + set + check)
- `grep -n "rsvp-checkmark" src/client/app.ts` — 2 matches (two replacement sites)
- `grep -n "toast-anim" src/client/app.ts` — 2 matches (showToast + showCopyToast)
- `grep -n "display:inline-block;font-size:11px;font-weight:700;color:var(--danger)" src/client/app.ts` — 2 matches (LIVE NOW + countdown)

## What to report back

1. Diff summary (which lines in `app.html` and `app.ts` changed)
2. Output of the 3 verification commands
3. The 9 grep results
4. Any deviations from this plan and why

## What NOT to do
- Do NOT change the `.fade-in` keyframe
- Do NOT change `.btn-pager` (tiny pagers, squish would feel weird)
- Do NOT add new functions outside what's specified
- Do NOT change `showToast` to use a wrapper library (keep vanilla)
- Do NOT touch the emoji-bounce loading screen
- Do NOT change the RSVP success emoji to the checkmark on the "Contact info updated" path (only the new RSVP path)
