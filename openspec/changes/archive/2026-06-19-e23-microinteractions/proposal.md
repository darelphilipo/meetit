# Change: Microinteractions

**Priority:** 2/5

## Why

After e20 (home card 2.0) the home card is visually dominant, but the rest of the app still feels like it has minimal motion. A UI audit found that almost all "delightful moments" are missing:

1. **Button press feels flat** — the existing `:active` state on `.btn` is `transform: translate(4px, 4px)` with `box-shadow: 0 0 0` (the shadow collapses). It's a flat "press" — no scale, no spring, no feel.
2. **Card enter is monolithic** — `.fade-in` animates the whole card as one block. The chips inside feel static. A 40ms stagger on the meta-row chips would make the card feel "alive".
3. **RSVP success has no celebration** — the success block (line 1000) is a static `🎉` emoji at 56px. No checkmark draw, no emoji-burst, no scale-in. The "moment of commitment" is muted.
4. **First-time RSVP doesn't bounce** — when the home card's RSVP button flips from pink to green (`btn-pink` → `btn-green`), there's no celebration. The user might not even notice the state change.
5. **Toast appears instantly** — `showToast()` sets a `transform: translateX(-50%)` and the toast just shows. No slide-in, no overshoot.
6. **Countdown blink is opacity-only** — the `blinkPulse` keyframe animates `opacity: 1 → 0.55 → 1`. A `transform: scale(1) → 1.05 → 1` would be more eye-catching and feels more "alive".

## What changes

Six surgical microinteraction additions. All CSS-only, all honor `prefers-reduced-motion`.

### 1. Press-and-squish on :active for all buttons

Add a `transform: scale(0.97)` to the existing `.btn:active` rule. Keep the existing `translate(4px, 4px)` for now (it's iconic to the neo-brutalist style) — but layer the scale on top for a 80ms tactile feel.

```css
.btn:active, .btn-white:active, .btn-pink:active, .btn-green:active, .btn-black:active {
  transform: translate(4px, 4px) scale(0.97);
}
```

Wait — that would override the existing translate. Better: add a NEW behavior on top. Use a transition timing adjustment instead.

```css
.btn { transition: transform var(--t-fast) var(--ease), box-shadow var(--t-fast) var(--ease); }
.btn:active { transform: translate(4px, 4px) scale(0.97); transition-duration: 80ms; }
```

Hmm, simpler: just add the scale to the existing `:active` rule. The combined `translate(4px, 4px) scale(0.97)` produces a "press down + squish" feel. Test by looking at a button: when pressed, it moves 4px down-right AND scales to 0.97. The combination feels more tactile than either alone.

Apply to all button variants and to `.footer-btn`, `.icon-btn`, `.close-btn`. Don't touch `.btn-pager` (those are tiny pagers, squishing them would feel weird).

### 2. Card enter stagger (40ms cascade on chips)

The home card's meta-row chips should fade in with a 40ms cascade. Use a CSS custom property `--i` set inline per chip:

```css
.event-tag { animation: fadeInUp 0.35s ease-out backwards; animation-delay: calc(var(--i, 0) * 40ms); }
```

In `renderHomeCard`, set `style="--i:0"`, `style="--i:1"`, `style="--i:2"` on each chip. Total stagger duration: 120ms (3 chips × 40ms). The whole card enter takes 350ms + 120ms = 470ms.

Actually, the whole card has `.fade-in` (350ms). The chips shouldn't add 120ms of latency — the user already sees the card appearing. Better: keep the chip stagger short (40ms each) and total under 150ms. Or skip the stagger entirely and just animate the chips as part of the card's fadeIn.

For minimal scope: just add the `--i` animation to `.event-tag` with a 40ms cascade, but use `animation-duration: 0.2s` (200ms) and `animation-delay: calc(var(--i) * 40ms)`. The chips are already visible by the time they animate.

### 3. Success checkmark draw on RSVP confirmation

The RSVP success block (line 1000, also line 1998) shows a 56px 🎉 emoji. Replace it with an SVG checkmark that draws itself:

```html
<svg class="rsvp-checkmark" viewBox="0 0 52 52" width="56" height="56">
  <circle class="rsvp-checkmark-circle" cx="26" cy="26" r="24" fill="none" stroke="#1c1c0f" stroke-width="4"/>
  <path class="rsvp-checkmark-path" fill="none" stroke="#00ff88" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" d="M14 27l7 7 16-16"/>
</svg>
```

CSS:
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

The circle draws first (0.4s), then the checkmark draws (0.3s starting at 0.4s). Total: 0.7s.

This is for the **regular RSVP** (success) only. The "Contact info updated" success can keep the ✅ emoji (less celebratory, just a confirmation).

### 4. RSVP first-time bounce (one-shot scale)

When the home card's RSVP button transitions from "🎟️ RSVP" (pink) to "✅ Going" (green), the button should do a 400ms scale bounce: `scale(1) → scale(1.08) → scale(1)`. One-shot, not loop.

Implementation: in `renderHomeCard`, after rendering the button, add a `rsvp-bounce` class. Use `setTimeout` to remove it after 450ms.

```css
@keyframes rsvpBounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
.rsvp-bounce { animation: rsvpBounce 400ms ease-out; }
```

In `app.ts`, after the `buildCardShell` call, find the RSVP button and add the class:
```ts
if (event.hasRsvped) {
  var rsvpBtn = c.querySelector(".btn-rsvp-card");
  if (rsvpBtn) {
    rsvpBtn.classList.add("rsvp-bounce");
    setTimeout(function() { rsvpBtn.classList.remove("rsvp-bounce"); }, 450);
  }
}
```

But wait — `hasRsvped` is a server-driven field. The bounce should only fire when the user JUST RSVP'd, not on every render. The existing `renderHomeCard` is called on every load. So the bounce will fire on every page load if the event is in the user's RSVP'd list.

Solution: only bounce if the user JUST RSVP'd in this session. Track it with a `justRsvpedIds: Set<string>` (or a plain object flag). When `submitRsvp()` succeeds, add the event ID to the set. In `renderHomeCard`, check the set — if the event ID is there, bounce and remove from set.

### 5. Toast slide-in with overshoot

The `showToast()` function (line 191) creates a div with `transform: translateX(-50%)` and appends it. The toast appears instantly. Add a slide-in animation.

```css
@keyframes toastSlideIn {
  0% { transform: translate(-50%, 100px); opacity: 0; }
  60% { transform: translate(-50%, -10px); opacity: 1; }
  100% { transform: translate(-50%, 0); opacity: 1; }
}
.toast-anim { animation: toastSlideIn 0.25s ease-out; }
```

In `showToast()`, add the class to the toast element. The existing `transform: translateX(-50%)` will be overridden by the keyframe — make sure the keyframe includes `-50%` in the translate.

Wait — the current toast uses `transform:translateX(-50%)` for centering. The new keyframe would need to preserve the `-50%` in X direction. Use `translate(-50%, 100px)` for the start state. OK.

But: `showToast()` sets the style via `t.style.cssText` which sets `transform: translateX(-50%)`. The animation class will override this with its own keyframe values. That works — CSS animation values override the static `transform`.

But the keyframe needs to end with the toast in the final position. Use `translate(-50%, 0)` for the end state — that gives the toast its centered position.

After the animation finishes (250ms), the toast stays in place because the animation ends at the same position as the static style. The animation auto-removes its effect.

### 6. Countdown transform pulse (replaces opacity blink)

The `blinkPulse` keyframe (line 158) animates `opacity: 1 → 0.55 → 1`. Replace with a `transform: scale(1) → 1.05 → 1` pulse:

```css
@keyframes blinkPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

This affects `.countdown-blink` which is used in:
- Home card countdown badge (line 365-ish, but updated to use `var(--danger)`)
- Home card LIVE NOW badge (e20)

The new scale pulse is more eye-catching than the opacity pulse. It also doesn't make the text "fade out" — the badge stays fully readable at all times.

Wait — `.countdown-blink` is also used on the home card countdown. If we change the keyframe globally, the change applies everywhere. That's the intent.

But: a `transform: scale(1.05)` requires `display: inline-block` or `display: flex` on the element. The badge HTML at line 365 is `<span class="countdown-blink" style="...">`. Span is inline by default — transform on an inline element is ignored. Need to add `display: inline-block` to the badge style.

Modify the badge HTML to include `display:inline-block` in the inline style.

## Out of scope

- Pull-to-refresh (separate, mobile-specific)
- Card-swap slide animation (already in e20)
- Skeleton shimmer (already in e22)
- Form input focus "pop" (out of scope for now)
- Confetti on first-ever RSVP (would need localStorage flag, more invasive)
- Re-architecting animation system (e.g., transitioning from CSS keyframes to Framer Motion)

## Risk

- **Low**: button squish is additive (scale added to existing translate). Touch devices that don't have `:active` will get the hover state only.
- **Low**: chip stagger uses `--i` custom property — supported in all modern browsers. Falls back to no-stagger if `--i` is not set.
- **Low**: checkmark SVG replaces a static emoji. The visual is different but the meaning is the same ("success").
- **Low**: RSVP bounce only fires on JUST-RSVP'd events (not on page reload). Implemented via a session flag.
- **Low**: toast slide-in adds 250ms before the toast appears. Users won't notice — the toast is brief.
- **Medium**: countdown transform pulse requires the badge to be `display: inline-block` (currently inline). Need to update the badge HTML.

## Verification

- `openspec validate e23-microinteractions --strict` — must pass
- `npx tsc --noEmit` — no new TS errors
- `npm run build` — must build clean
- `npm test` — all 10 tests pass
- Press a button → see a 80ms squish
- Reload home with no RSVP → no bounce
- Submit RSVP → home card RSVP button bounces once
- Submit RSVP → success overlay shows a checkmark drawing
- Toast appears → slides in from bottom
- Countdown badge pulses with scale (not opacity)
