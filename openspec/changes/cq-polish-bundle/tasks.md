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

## 4. CQ8: Dedupe CATEGORY_EMOJI

- [ ] 4.1 Remove the local `CATEGORY_EMOJI` in `app.ts`
- [ ] 4.2 Import from `meetit.ts` (already shared)

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
