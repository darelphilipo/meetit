# Change: Home Card 2.0

**Priority:** 4/5

## Why

The home card is the most-viewed surface in Meetit. A UI audit (June 2026) found that despite existing animations (fadeInUp, blinkPulse), the card feels **visually flat** compared to competitor event apps. Specific gaps:

1. **The 12 category colors are invisible** — `CAT_MAP` defines 12 distinct hexes for categories (Tech purple, Food orange, etc.) but they only paint a tiny badge buried in a 3-chip row. Users can't tell a Tech event from a Food event at a glance.
2. **Title is 18px** — same size as the body of `.btn`. Doesn't feel like a hero. The `.header h1` is 22px (bigger than the card title!).
3. **Emoji tile is 40px** — barely larger than a list icon. Should be a 56px hero icon.
4. **Three action buttons are visually equal** — Details / RSVP / Share all 38px tall, 12px font, same flex weight. The primary RSVP CTA gets no visual dominance. Apple HIG says: *"one filled button per view"*.
5. **No "happening now" state** — events within 30 minutes get the same treatment as events 3 weeks out. Missed urgency cue.
6. **Card swap is invisible** — `homePrev()` / `homeNext()` re-render with `noFade: true` (to skip fadeInUp), but there's no horizontal slide. Users don't see the card change.

## What changes

### 1. Category accent stripe

Every home event card gets a 6px solid colored stripe down the left edge, using the category color from `CAT_MAP`. Implementation:
- Add a `border-left: 6px solid var(--cat-color)` to `.card-shell` (via a `catColor` param to `buildCardShell`)
- Or, simpler: pass the hex directly as `style="border-left:6px solid #6366f1;"` — keeps buildCardShell unchanged

We pick the latter: minimum surgical change.

### 2. Bigger title

The home card `<h3>` title bumps from 18px → 22px (matches the app header). Line-height stays 1.25. Organizer meta bumps 12px → 13px.

### 3. Bigger emoji tile

The 40px emoji tile bumps to 56px. Font-size of the emoji inside bumps 22px → 32px. The fallback `📅` (no emoji on the event) tile also bumps 16px → 22px.

### 4. Restructured meta row

Current: 3 chips in a row — time, RSVP count, category.
New: same 3 chips but with a more compact layout (10px gap, 4px padding) so they don't dominate the card. Category badge stays at the right edge (visual weight equal to time/count).

Actually, after looking at the Stitch mockup more carefully, the chip row stays as-is. The main visual change is the accent stripe + bigger title + bigger tile. The chip row is fine. **Skip this change.**

### 5. Asymmetric button sizing

The action row currently has: `Details →` (flex:1) | `🎟️ RSVP` (flex:1) | `📤` (icon).

New: `Details →` (flex:1) | `🎟️ RSVP` (flex:2) | `📤` (icon). RSVP is now twice as wide as Details, making it the visual hero. Also: both buttons get `min-height: 44px` (already done in e21).

The RSVP button keeps `btn-pink` (default) or `btn-green` (already RSVP'd).

### 6. "LIVE NOW" state

For events whose start time is within the next 30 minutes, the home card header rightHtml shows a pulsing red badge:
- `🔴 LIVE NOW` (no specific time — just the urgency indicator)
- 3px solid `var(--danger)` border, `var(--danger-bg)` background
- 11px/700 red text
- Replaces the regular date text (not in addition)
- Uses the `countdown-blink` class for the pulse animation

This adds a new tier to the existing urgency hierarchy:
- **0–30 min** → `🔴 LIVE NOW` (pulsing red)
- **30 min – 24 hours** → `⏰ X hrs to go` (pulsing red, existing)
- **24 hours – 7 days** → `Tomorrow` / `In 3 days` (muted text, existing)
- **7+ days** → `Sat, Jun 22` (muted text, existing)

### 7. Card-swap slide

When the user clicks Prev / Next on the home card, instead of the `noFade: true` re-render, the card slides in horizontally:
- New card enters with `translateX(±20px) → 0` over 200ms
- Old card exits with `translateX(0) → ∓20px)` (or just gets replaced — simpler)

Simplest implementation: when prev/next is clicked, briefly add a `card-swap` class to the card-shell that runs a 200ms `translateX(-20px) → 0` animation, then remove the class.

In CSS:
```css
@keyframes cardSwapIn {
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.card-swap { animation: cardSwapIn 200ms ease-out; }
```

In `app.ts`, modify `homePrev()` and `homeNext()` to add `card-swap` class to the card-shell after re-render. Use a 200ms timeout to remove it. (Or use the existing `noFade: true` path and add the class via the new `card-swap` class.)

Direction matters: prev should slide in from the left, next from the right. Two classes:
- `.card-swap-prev` — slides from `translateX(-20px)` (the card came from the left)
- `.card-swap-next` — slides from `translateX(20px)`

## Out of scope

- The mod-dashboard cards (different visual treatment, no accent stripe)
- The my-stuff cards (same)
- The emoji background wallpaper (unchanged)
- The card-swap animation for mod dashboard / my stuff (e23 microinteractions scope)
- Stagger animation for the meta row chips (e23)
- Pull-to-refresh (e23)
- Dark-mode-specific styles for the new elements (they use existing tokens)

## Risk

- **Medium**: bumping the title 18→22px could cause some titles to truncate to 2 lines earlier. The card uses `-webkit-line-clamp: 2` already, so it's controlled.
- **Low**: asymmetric button flex (1:2) on very narrow viewports could push the share icon button off the row. Mitigation: the existing `flex-wrap: wrap` is NOT on this row — it relies on flex sizing. We may need to add `flex-wrap: wrap` to handle the 360px viewport.
- **Low**: card-swap animation needs to NOT play on the initial render (only on prev/next). The implementation adds the class in `homePrev()` / `homeNext()`, not in the main `renderHomeCard` path.
- **Low**: LIVE NOW state changes the rightHtml logic. Make sure the 30-min boundary uses `eventStart - now <= 30min` and `eventStart > now` (don't show LIVE NOW for past events — they shouldn't be in the list anyway per the home-page filter).

## Verification

- `openspec validate e20-home-card-2 --strict` — must pass
- `npx tsc --noEmit` — no new TS errors
- `npm run build` — must build clean
- `npm test` — all 10 tests pass
- Visual: home card has visible purple/orange/green/etc. accent stripe down the left edge
- Visual: title is 22px (was 18px), emoji tile is 56px (was 40px)
- Visual: RSVP button is ~2× the width of Details button
- Functional: at T-25 minutes, the rightHtml shows "🔴 LIVE NOW" instead of "⏰ <1 hr to go"
- Functional: clicking Next triggers a horizontal slide-in animation
