## 1. Refactor splitTextToPages

- [ ] 1.1 Add `fontSize: number = 15` parameter to `splitTextToPages` signature
- [ ] 1.2 Remove `font-size:15px` from `_measureDiv.style.cssText` initial style
- [ ] 1.3 Add `_measureDiv.style.fontSize = fontSize + "px"` before measuring
- [ ] 1.4 Keep default of 15 for backward compatibility

## 2. Update call sites (current line numbers)

Render font sizes verified from inline styles in the page builder functions:

| Context | Render font | Measured as | Call site lines |
|---------|-----------|-------------|-----------------|
| My Stuff card | 13px (`buildMyStuffDescPagesHTML` L678) | 15px (wrong by 2px) | L565, L606, L650 |
| Mod card (in-card) | 14px (`buildModDescPagesHTML` L1185) | 15px (wrong by 1px) | L1119, L1131 |
| Review event wizard | 14px (`buildModDescPagesHTML` L1185) | 15px (wrong by 1px) | L2010, L2022 |
| Mod detail overlay | 15px (`buildDescPagesHTML` L784) | 15px (exact) | L1517, L1527, L2193 |
| User detail overlay | 15px (`buildDescPagesHTML` L784) | 15px (exact) | L2078 |

- [ ] 2.1 `app.ts:565` (My Stuff RSVP desc) → pass `13`
- [ ] 2.2 `app.ts:606` (My Stuff event desc) → pass `13`
- [ ] 2.3 `app.ts:650` (My Stuff pitch desc) → pass `13`
- [ ] 2.4 `app.ts:1119` (mod card desc retry) → pass `14`
- [ ] 2.5 `app.ts:1131` (mod card desc initial) → pass `14`
- [ ] 2.6 `app.ts:2010` (review event desc retry) → pass `14`
- [ ] 2.7 `app.ts:2022` (review event desc initial) → pass `14`
- [ ] 2.8 `app.ts:1517, 1527, 2078, 2193` (mod detail + user detail overlays) → pass `15` (or omit for default)

## 3. Logging

- [ ] 3.1 Optional: log `log("splitTextToPages fontSize={n} width={w} height={h} pages={n}")` for debugging
- [ ] 3.2 If added, gate behind debug mode

## 4. Test

- [ ] 4.1 Visual test: open a mod card with a long description → no overflow at page bottoms
- [ ] 4.2 Visual test: open a My Stuff card with a long description → no overflow
- [ ] 4.3 Visual test: user detail still works (default of 15)
- [ ] 4.4 Visual test: review event step in submit wizard → no overflow

## 5. Polish

- [ ] 5.1 Run `npm run build`, `npm test`, `npm run type-check`
- [ ] 5.2 Commit, push, `openspec archive fix-desc-pagination-font-size`
