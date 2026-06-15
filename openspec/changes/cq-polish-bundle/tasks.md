## 1. CQ3: Error Boundaries

- [ ] 1.1 Wrap `renderHomeCard`, `renderModCard`, `renderMyRsvpCard`, etc. in try/catch
- [ ] 1.2 On error, render `<div class="error-state">😵 Render error: {message}</div>` and log
- [ ] 1.3 Log `log("render-error function={name} error={e}")`

## 2. CQ5: Remove console.log Fallback

- [ ] 2.1 In `log()`, remove the `console.log(message)` line (debug panel is the only surface)
- [ ] 2.2 Keep the `console.error` for unexpected errors

## 3. CQ7: Action Lock TTL

- [ ] 3.1 Add timestamp to each `actionLocks[action]`
- [ ] 3.2 Periodic cleanup (every 60s) removes locks older than 5 minutes

## 4. CQ8: Dedupe Category Data (3 sources → 1)

**The problem:** three sources of truth for the same 12 categories:
- `EventCategories` in `src/shared/api.ts:90` (canonical: id + label + emoji + color)
- `CAT_MAP` in `src/client/app.ts:47` (duplicated)
- `CATEGORY_EMOJI` in `src/shared/meetit.ts:8` (duplicated, emoji only)

**The fix:** make `EventCategories` the single source, derive the other two from it.

- [ ] 4.1 In `src/client/app.ts`: import `EventCategories` from `api.ts` at the top of the file
- [ ] 4.2 Build `CAT_MAP` at module load: `var CAT_MAP: Record<string, ...> = Object.fromEntries(EventCategories.map(c => [c.id, c]))`
- [ ] 4.3 Remove the hardcoded `CAT_MAP` literal (lines 47-61)
- [ ] 4.4 In `src/shared/meetit.ts`: remove the `CATEGORY_EMOJI` constant
- [ ] 4.5 Update the form validation at `meetit.ts:74` to import `EventCategories` and use `EventCategories.find(c => c.id === formData.category)?.emoji`
- [ ] 4.6 Verify category emoji rendering still works in: home card category badge, mod card category badge, My Stuff form, pitch form
- [ ] 4.7 Add a comment at the top of `EventCategories` in `api.ts`: `// Single source of truth for categories. app.ts and meetit.ts derive from this. Do not duplicate.`
- [ ] 4.8 Manual test: add a test category to `EventCategories`, verify it shows in all 3 places without other code changes

## 5. CQ10: Reduced Motion

- [ ] 5.1 Add `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }` to `app.html`

## 6. CQ12: Lint/Format

- [ ] 6.1 Add `.eslintrc.json` with TypeScript rules
- [ ] 6.2 Add `.prettierrc` with project conventions
- [ ] 6.3 Add `lint` and `format` scripts to `package.json`
- [ ] 6.4 Add `lint:fix` and `format:check` scripts

## 7. Logging & Polish

- [ ] 7.1 Add `log()` calls at every changed path per §0.2
- [ ] 7.2 Run `npm run build`, `npm test`, `npm run type-check`, `npm run lint`
- [ ] 7.3 Commit, push, create OpenSpec archive
