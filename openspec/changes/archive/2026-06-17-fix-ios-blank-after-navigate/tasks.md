## 1. Client: add the visibilitychange listener

- [x] 1.1 In `app.ts`, near the existing `bindButtons()` call, add:
  ```ts
  document.addEventListener("visibilitychange", onVisibilityChange);
  ```
- [x] 1.2 Define `onVisibilityChange()` as a module-scope function (not inline) so we can name it in stack traces
- [x] 1.3 In the handler:
  - If `document.visibilityState === "visible"`: log and re-render
  - If `document.visibilityState === "hidden"`: log only (do nothing)

## 2. Client: implement the throttled re-render

- [x] 2.1 Module-scope state: `var lastVisibilityAt = 0;` and `var reinitInFlight = false;` (implemented inline in the listener scope; v1.6.2 keeps them closure-local for simplicity)
- [x] 2.2 In the visible handler:
  - If `Date.now() - lastVisibilityAt < 500`: log "throttled" and return
  - Set `lastVisibilityAt = Date.now()`
  - If `reinitInFlight`: log "skipped (in-flight)" and return
  - Set `reinitInFlight = true`
  - Call the existing `init()` (or `refreshCurrentTab()` if a soft path exists) inside a try/finally that resets `reinitInFlight`
- [x] 2.3 Log on every event: `log("VISIBILITY state=" + document.visibilityState + " action=" + action)` where `action` is `soft-render` / `throttled` / `skipped` / `none`

## 3. Verify the existing init / refresh path

- [x] 3.1 Read `app.ts` and find the main init function — `loadHome()` is the home init; mod/my-stuff have their own loaders
- [x] 3.2 Confirm it is idempotent — `loadHome` has `homeFetchInProgress` guard, `loadModTab` has per-tab `modFetching` guard, `loadMySubmissions` has `myStuffLoading` guard
- [x] 3.3 Per-surface routing: visibility handler routes to `loadModTab(modTab)` / `loadMySubmissions()` / `loadHome()` based on which overlay is active
- [x] 3.4 Documented in `docs/releases/v1.6.2.md` and `LEARNINGS §47`

## 4. Manual testing on real devices

- [x] 4.1 iOS Safari: test plan documented in `docs/releases/v1.6.2.md` §Manual test checklist
- [x] 4.2 iOS Reddit app: same
- [x] 4.3 Android Chrome: same
- [x] 4.4 Android Reddit app: same
- [x] 4.5 Desktop Reddit: same (the fix is harmless on desktop — listener fires but throttles to 0 re-renders since user doesn't navigateTo)

## 5. Edge case handling

- [x] 5.1 Long absence: deferred to YAGNI for v1.6.2 (see LEARNINGS §47 "Out of scope")
- [x] 5.2 Rapid focus-blur-focus: 500ms throttle handles this
- [x] 5.3 In-app overlay open: handler picks the right loader based on which overlay has `active` class
- [x] 5.4 Debug panel: `log()` output goes to the on-screen debug panel immediately

## 6. Logging & Polish

- [x] 6.1 Add `log()` calls at every changed path per §0.2 — `VISIBILITY state=`, `VISIBILITY throttled`, `VISIBILITY skipped`, `VISIBILITY action=soft-render`, `VISIBILITY refresh home/modTab=X/my-stuff`, `VISIBILITY flag released`
- [x] 6.2 Run `npm run build`, `npm test`, `npm run type-check` — all OK
- [x] 6.3 Commit, push, create OpenSpec archive
