## 1. Refactor prefillOrganizer

> **DEFERRED — proposal deprioritized to priority 1/5 on 2026-06-17.** Flag IS reset on the caught error path today (the `prefillLoading = false` line runs unconditionally after try/catch). The "stuck" scenario requires the `log()` call in the catch block to throw, which is essentially never. Re-prioritize to 3/5 if a user reports a stuck prefill.

- [ ] 1.1 Wrap body in try/finally; move `prefillLoading = false` to finally
- [ ] 1.2 Add entry log `prefillOrganizer: fetching /api/init`
- [ ] 1.3 Add success log `prefillOrganizer: success user={u}`
- [ ] 1.4 Add error log inside catch
- [ ] 1.5 Add finally log `prefillOrganizer: flag released`

## 2. Refactor loadMySubmissions

> **DEFERRED — same as above.**

- [ ] 2.1 Wrap body in try/finally; move `myStuffLoading = false` to finally
- [ ] 2.2 Add entry log `loadMySubmissions: seq={n}`
- [ ] 2.3 Add success log `loadMySubmissions: success rsvps={n} events={n} pitches={n}`
- [ ] 2.4 Add error log inside catch
- [ ] 2.5 Add finally log `loadMySubmissions: flag released`

## 3. Logging & Polish

- [ ] 3.1 Verify all logs surface in debug panel
- [ ] 3.2 Update LEARNINGS.md if there's a new lesson (loading flag pattern)
- [ ] 3.3 Run `npm run build`, `npm test`, `npm run type-check`
- [ ] 3.4 Commit, push, `openspec archive fix-prefill-loading-stuck`

## 4. Tests

- [ ] 4.1 Manual test: stub `/api/init` to throw → reload page → organizer field still gets pre-filled (after stub is removed)
- [ ] 4.2 Manual test: trigger loadMySubmissions twice rapidly → second call respects the flag
