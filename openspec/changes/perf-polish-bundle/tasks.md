## 1. PERF4: Targeted DOM Updates

- [ ] 1.1 Refactor `renderHomeCard` to build the card once and cache child elements
- [ ] 1.2 New `updateHomeCard()` updates only title, date, RSVP count, etc.
- [ ] 1.3 `homeNext()` and `homePrev()` call `updateHomeCard()` instead of full rebuild
- [ ] 1.4 Verify the new approach passes all existing behavior tests

## 2. PERF5: Reduce Background Emoji

- [ ] 2.1 Edit `public/app.html` `body::before` to use 5-6 emojis instead of 20
- [ ] 2.2 Or remove entirely and use a static gradient

## 3. PERF6: Font Display Swap

- [ ] 3.1 Add `&display=swap` to Google Fonts URL in `public/app.html`
- [ ] 3.2 Or use `font-display: swap` in `@font-face` if self-hosting

## 4. Logging & Polish

- [ ] 4.1 Add `log()` calls at every changed path per §0.2
- [ ] 4.2 Run `npm run build`, `npm test`, `npm run type-check`
- [ ] 4.3 Commit, push, create OpenSpec archive
