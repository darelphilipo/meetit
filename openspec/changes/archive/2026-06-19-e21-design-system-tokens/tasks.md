# Tasks: e21 Design System Tokens

## 1. Add color tokens to :root

In `public/app.html`, extend the `:root` block (lines 9-20) with:

- `--danger: #ff4444; --danger-bg: #fff3f3;`
- `--warn: #ffaa00; --warn-bg: #fff7e0;`
- `--success: #00ff88; --success-bg: #d4ffe8;`
- `--on-primary: #1c1c0f;`
- `--on-secondary: #1c1c0f;`
- `--pitch-bg: #ffeaa7;`
- `--pending-bg: #ff69b4;`
- `--neutral: #999;`
- `--outline-soft: #cac8aa;` (already exists — verify)

All new tokens get a `light-dark(light, dark)` wrapper where a dark-mode variant makes sense.

## 2. Add dark mode via color-scheme + light-dark()

In `public/app.html`:

- Add `color-scheme: light dark;` to `:root`
- Wrap every color var in `light-dark(lightVal, darkVal)`:
  - `--bg: light-dark(#fdfae4, #1a1a1b);`
  - `--surface: light-dark(#f2efd9, #272729);`
  - `--on-surface: light-dark(#1c1c0f, #d7dadc);`
  - `--muted: light-dark(#484831, #8a8c8e);`
  - `--border-color: light-dark(#1c1c0f, #d7dadc);` — note: invert to highlight in dark
  - `--danger-bg: light-dark(#fff3f3, #4a1a1a);`
  - `--success-bg: light-dark(#d4ffe8, #1a3a2a);`
  - `--pitch-bg: light-dark(#ffeaa7, #3a3520);`
  - `--pending-bg: light-dark(#ff69b4, #c64a8e);` (slightly desaturated for dark)
- Update the `body::before` emoji wallpaper opacity to use a token: `--emoji-opacity: light-dark(0.04, 0.07);`
- Update `--shadow-sm` / `--shadow-md` to use the token: `var(--border-color)` instead of `#1c1c0f`

## 3. Bump touch targets

In `public/app.html`:

- `.btn-action` min-height 38px → 44px (line 77)
- `.btn-icon` min-height/min-width 38px → 44px (line 80)
- `.btn-pager` min-height 24px → 28px (line 85) — keep it lean, these are dense pagers
- `.btn-empty` min-height 30px → 36px (line 89)
- `.icon-btn` 36×36 → 44×44 (line 173) — header icon buttons

## 4. Delete dead CSS + add card-shell variants

In `public/app.html`:

- Delete `.idea-card` block (lines 181-182)
- Delete `.pending-card` block (lines 183-185)
- Add new variants:
  - `.card-shell--pitch { background: var(--pitch-bg); }`
  - `.card-shell--pending { background: var(--pending-bg); }`

In `src/client/app.ts`:

- Find all inline `style="background:#ffeaa7"` in `renderMyPitchCard` and replace with `class="card-shell card-shell--pitch"`
- Find all inline `style="background:#ff69b4"` in `renderMyEventCard` / `renderModCard` (pending tab) and replace with `class="card-shell card-shell--pending"`

## 5. Add safe-area insets

In `public/app.html`:

- `body { padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)) }` (replace line 22)
- `.overlay-header { padding-top: max(12px, env(safe-area-inset-top)) }` (extend line 105)
- `.overlay-footer { padding-bottom: max(8px, env(safe-area-inset-bottom)) }` (extend line 140)
- `.container { padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)) }` — wait, container is a flex child, body has the padding. Skip.

## 6. Add typography semantic classes

In `public/app.html`, add after the existing `.btn` styles:

```css
.card-title-lg { font-size: 18px; font-weight: 700; line-height: 1.25; margin: 0; word-break: break-word; }
.card-title-md { font-size: 17px; font-weight: 700; line-height: 1.3; margin: 0; word-break: break-word; }
.card-title-sm { font-size: 15px; font-weight: 700; line-height: 1.3; margin: 0; word-break: break-word; }
```

In `src/client/app.ts`, replace inline h3 styles in:

- `renderHomeCard` (line 375): `style="font-size:18px;font-weight:700;margin:0;line-height:1.25;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word;"` → `class="card-title-lg"` + keep the line-clamp styles (they need to be inline since `display:-webkit-box` doesn't compose well with class)
- `renderModCard` (line 1064): same pattern
- `renderMyRsvpCard` (line 548): use `class="card-title-md"`
- `renderMyPitchCard` (line 591): use `class="card-title-md"`
- `renderMyEventCard` (line 633): use `class="card-title-md"`

Approach: keep the ellipsis line-clamp as an inline style since pseudo-classes don't compose with the `-webkit-box` model cleanly. Replace only the font-size/line-height/margin properties.

## 7. Add avatar-circle class

In `public/app.html`, add:

```css
.avatar-circle { width: 36px; height: 36px; border: var(--border); background: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; flex-shrink: 0; }
```

In `src/client/app.ts`:

- `app.ts:896` (event details organizer): replace the 36×36 inline block with `class="avatar-circle"`
- (If we find other 28/40px avatars in audit, replace them too — but only if they look the same)

## 8. Use new status color tokens in app.ts

In `src/client/app.ts`:

- `app.ts:365` (countdown badge): replace `#ff4444` and `#fff3f3` with `var(--danger)` and `var(--danger-bg)`; also bump `border:1px` to `border:var(--border)` — wait, var(--border) is `4px solid #1c1c0f` which is too thick. Instead, just use `var(--border-color)` for the color and keep 3px to feel chippy: `border: 3px solid var(--danger);`
- `app.ts:1084` (mod urgent badge): replace `#ffaa00` with `var(--warn)`
- `app.ts:1091-1092`: replace `#ff4444`, `#ffaa00`, `#00ff88` with `var(--danger)`, `var(--warn)`, `var(--success)`
- `app.ts:1097`: replace `#999` with `var(--neutral)`

## 9. Update reduced-motion media query

The existing `@media (prefers-reduced-motion: reduce)` block (line 258-261) is fine — keep as-is.

## 10. Verify

- `npx tsc --noEmit` — no new TS errors
- `npm run build` — must build clean
- `npm test` — all 10 tests pass
- Light mode visual: must be byte-identical or near-identical
- Dark mode: flip OS to dark, all 5 surfaces (home, mod, my-stuff, overlay, empty-state) should be readable
