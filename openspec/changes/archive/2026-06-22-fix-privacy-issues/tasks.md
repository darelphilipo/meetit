# fix-privacy-issues — Tasks

- [x] 1. Server `onServerLogs`: add `await requireMod()` at the top, log denied access attempts
- [x] 2. Server `onInit`: include `isMod` field in response, log it via `serverLog`
- [x] 3. `public/app.html`: add `style="display: none;"` to debug toggle button
- [x] 4. Client `app.ts`: add `applyDebugPanelVisibility()` helper that reveals toggle for mods
- [x] 5. Client `fetchServerLogs()`: bail out early if `!cachedHomeIsMod`, log the skip
- [x] 6. Client debug toggle click handler: guard with `if (!cachedHomeIsMod) return;`
- [x] 7. Client `loadHome()`: call `applyDebugPanelVisibility()` after setting `cachedHomeIsMod`
- [x] 8. Client `renderHomeCard()`: call `applyDebugPanelVisibility()` to re-apply on render
- [x] 9. Client `prefillOrganizer()`: set `cachedHomeIsMod` from `data.isMod` and apply visibility
- [x] 10. `npm test` (52/52 pass), `npm run type-check` (no new errors), `npm run build` (success)
- [x] 11. `openspec validate --all --strict` passes
- [x] 12. Update LEARNINGS with new section
- [x] 13. Commit and push to GitHub
- [x] 14. Deploy to `r/meetup_hub2_dev` and verify (mod sees toggle, non-mod does not)
