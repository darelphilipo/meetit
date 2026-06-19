# Change: Design System Tokens, Dark Mode & Touch Targets

**Priority:** 3/5

## Why

A UI audit (June 2026) found significant drift in our CSS:
- 7 hardcoded hex colors used inconsistently across components (countdown badge, mod-dashboard badges, RSVP button, mod pending/dismiss icons).
- No dark-mode support — Reddit users on iOS Safari predominantly use dark mode, and our neo-brutalist style (yellow + pink) translates well to dark.
- Touch targets are below Apple HIG (44pt) and Material (48dp): `.btn-action` is 38px, `.btn-pager` is 24px, `.btn-icon` is 38px.
- Dead CSS: `.idea-card` and `.pending-card` are defined in `app.html:181-185` but never used — the code uses inline `style="background:#ffeaa7"` and `style="background:#ff69b4"` instead.
- No safe-area handling for iPhone notch / home indicator.
- Typography drift: 5 different h3 sizes across `renderHomeCard`, `renderModCard`, `renderMyRsvpCard`, `renderMyPitchCard`, `renderMyEventCard`.
- Inconsistent avatar circles (3 different sizes: 28px, 36px, 40px).

## What changes

Add a proper token layer to the design system, ship dark mode, and fix the most impactful touch-target / typography drift. No new dependencies. All CSS-only.

### New CSS tokens (in `:root`)
- Status colors: `--danger`, `--danger-bg`, `--warn`, `--warn-bg`, `--success`, `--success-bg`
- Semantic colors: `--on-primary`, `--on-secondary`
- Background colors: `--pitch-bg`, `--pending-bg` (replaces inline `style="background:..."`)
- Category accent: `--cat-tech`, `--cat-food`, etc. (or keep using CAT_MAP JS object — see decision below)
- New tokens get `light-dark(lightVal, darkVal)` for free dark mode

### Light/dark support
- Add `color-scheme: light dark` on `:root`
- Wrap every existing color var in `light-dark(light, dark)` — single CSS change
- Background goes `#fdfae4` → `#1a1a1b`; `--on-surface` stays light text `#d7dadc`; yellow primary stays yellow (it pops better on dark)
- Emoji wallpaper opacity bumps 0.04 → 0.07 on dark (cream is too light on dark)
- `prefers-color-scheme` is respected automatically by `light-dark()`

### Touch targets
- `.btn-action` min-height 38px → 44px
- `.btn-icon` min-height/min-width 38px → 44px
- `.btn-pager` min-height 24px → 28px (compromise — desc pagers don't fit at 44px)
- `.btn-empty` min-height 30px → 36px
- `.icon-btn` 36×36 → 44×44

### Dead CSS cleanup
- Delete `.idea-card` and `.pending-card` rules (lines 181-185 of `app.html`)
- Replace inline `style="background:#ffeaa7"` (pitch cards) with `class="card-shell--pitch"` using `--pitch-bg: #ffeaa7`
- Replace inline `style="background:#ff69b4"` (pending cards) with `class="card-shell--pending"` using `--pending-bg: #ff69b4`

### Safe-area insets
- `body { padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)) }`
- Same on `.overlay-header` and `.overlay-footer`
- Debug panel and toasts get safe-area-bottom too

### Typography
- Add semantic classes: `.card-title-lg` (18px home/mod), `.card-title-md` (17px my-stuff), `.card-title-sm` (15px dense lists)
- All use `line-height: 1.25`, `font-weight: 700`, `margin: 0`
- Replace 5 inline h3 styles in `renderHomeCard`, `renderModCard`, `renderMyRsvpCard`, `renderMyPitchCard`, `renderMyEventCard`

### Avatar
- New `.avatar-circle` class: `width:36px; height:36px; border: var(--border); background:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px; flex-shrink:0;`
- Use in `app.ts:896` (event details organizer) and anywhere a 28/40px avatar is currently inline

## Out of scope

- Category color tokens (CAT_MAP stays in JS — it's dynamic, not a static token)
- Live-now state (e20)
- Card-swap slide animation (e23)
- Staggered enter animation (e23)
- Confetti / checkmark draw (e23)
- Form validation (e22)

## Risk

- **Low**: pure CSS additions + a couple of `light-dark()` wrappers. Visual identical in light mode (which is the default in 99% of cases until Reddit ships theme context).
- **Medium**: bumping touch targets to 44px could push buttons to wrap on very narrow viewports. We have `flex-wrap:wrap` on the mod pending actions already, but need to verify.
- **Low**: removing dead CSS has zero visual impact (it was never used).
- **Low**: `light-dark()` is supported in Safari 17.5+ (March 2024) and Chrome 123+ (March 2024). All Reddit iOS users are on 17.5+. No fallback needed.

## Verification

- `openspec validate e21-design-system-tokens --strict` — must pass
- `npx tsc --noEmit` — no new TS errors
- `npm run build` — must build clean
- `npm test` — all 10 tests must still pass
- Light mode visual diff — must be byte-identical to pre-change (every existing color is wrapped in `light-dark(EXISTING, EXISTING)` semantically — but with a real dark value)
