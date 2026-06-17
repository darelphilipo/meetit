## 1. UX12: Debug Toggle Position

- [ ] 1.1 Move debug toggle from `position: fixed; bottom: 8px; right: 8px` to header
- [ ] 1.2 Or add `padding-bottom: 60px` to `#app` content on mobile
- [ ] 1.3 Verify on iOS/Android that debug toggle doesn't overlap card content

## 2. UX13: My Stuff Loading States

- [ ] 2.1 In `switchMyStuffTab`, show `<div class="my-stuff-loading">⏳ Loading...</div>` in body
- [ ] 2.2 Replace with real content when fetch completes
- [ ] 2.3 Log `log("my-stuff-tab-switch from={tab} to={tab}")`

## 3. UX14: setBtnLoading in Mod Actions

> **Audit (2026-06-17): 6 of 8 actions already use setBtnLoading.** The remaining 2 (approveEvent at app.ts:1224, deleteEvent at app.ts:1239) still use manual inline styling. Both are 5-minute fixes.

- [ ] 3.1 Refactor `approveEvent()` to use `setBtnLoading(btn, true)` and `setBtnLoading(btn, false)` on success/failure
- [ ] 3.2 Refactor `deleteEvent()` to use `setBtnLoading(btn, true)` and `setBtnLoading(btn, false)` on success/failure
- [ ] 3.3 Verify rapid-tap doesn't leave buttons stuck

## 4. Logging & Polish

- [ ] 4.1 Add `log()` calls at every changed path per §0.2
- [ ] 4.2 Run `npm run build`, `npm test`, `npm run type-check`
- [ ] 4.3 Commit, push, create OpenSpec archive
