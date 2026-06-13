## 1. Card Shell Foundation

- [x] 1.1 Add reusable card shell CSS classes to `public/app.html`
- [x] 1.2 Add `buildCardShell()` helper and `updateCardDots()` / `updateCardNav()` helpers to `src/client/app.ts`
- [x] 1.3 Build project and verify no regressions

## 2. Home Page Redesign

- [x] 2.1 Refactor `renderHomeCard()` to use full-viewport card shell
- [x] 2.2 Move prev/next to fixed footer bar; add progress dots
- [x] 2.3 Update primary action buttons: "View Details →" + "🎟️ RSVP"
- [x] 2.4 Verify home navigation, RSVP, and detail open still work

## 3. Mod Dashboard Redesign

- [x] 3.1 Add fixed footer + progress dots to `#mod-screen` in `public/app.html`
- [x] 3.2 Make `#pending-events-container` absolute-fill
- [x] 3.3 Refactor `renderModCard()` to use card shell with tab-specific colors
- [x] 3.4 Remove inline prev/next from mod cards; wire footer nav
- [x] 3.5 Verify approve/decline/delete/dismiss and tab switching

## 4. My Stuff Redesign

- [x] 4.1 Add progress dots to `#my-stuff-overlay` in `public/app.html`
- [x] 4.2 Unify `renderMyRsvpCard()`, `renderMyEventCard()`, `renderMyPitchCard()` to card shell
- [x] 4.3 Keep existing footer prev/next but style consistently
- [x] 4.4 Verify leave/update/cancel/delete bounce guards still work

## 5. Polish, Test, Deploy

- [x] 5.1 Unify spacing/typography tokens; add fade transitions
- [x] 5.2 Add `log()` calls at every changed path per §0.2
- [x] 5.3 Run `npm run build` and `npm test`
- [ ] 5.4 Commit changes and deploy to r/meetup_hub2_dev
