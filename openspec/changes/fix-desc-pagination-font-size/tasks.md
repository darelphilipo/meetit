## 1. Refactor splitTextToPages

- [ ] 1.1 Add `fontSize: number = 15` parameter to `splitTextToPages` signature
- [ ] 1.2 Remove `font-size:15px` from `_measureDiv.style.cssText` initial style
- [ ] 1.3 Add `_measureDiv.style.fontSize = fontSize + "px"` before measuring
- [ ] 1.4 Keep default of 15 for backward compatibility

## 2. Update call sites

- [ ] 2.1 `app.ts:505` (My Stuff rsvp desc paginate) → pass `13`
- [ ] 2.2 `app.ts:542` (My Stuff event desc paginate) → pass `13`
- [ ] 2.3 `app.ts:586` (My Stuff pitch desc paginate) → pass `13`
- [ ] 2.4 `app.ts:1034` (mod card desc retry paginate) → pass `14`
- [ ] 2.5 `app.ts:1043` (mod card desc initial paginate) → pass `14`
- [ ] 2.6 `app.ts:1383, 1393, 1788, 1903` (user details / mod detail) → pass `15` explicitly (or omit)

## 3. Logging

- [ ] 3.1 Optional: log `log("splitTextToPages fontSize={n} width={w} height={h} pages={n}")` for debugging
- [ ] 3.2 If added, gate behind debug mode

## 4. Test

- [ ] 4.1 Visual test: open a mod card with a long description → no overflow at page bottoms
- [ ] 4.2 Visual test: open a My Stuff card with a long description → no overflow
- [ ] 4.3 Visual test: user detail still works (default of 15)

## 5. Polish

- [ ] 5.1 Run `npm run build`, `npm test`, `npm run type-check`
- [ ] 5.2 Commit, push, `openspec archive fix-desc-pagination-font-size`
