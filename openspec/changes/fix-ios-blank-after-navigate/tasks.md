## 1. Client: add the visibilitychange listener

- [ ] 1.1 In `app.ts`, near the existing `bindButtons()` call, add:
  ```ts
  document.addEventListener("visibilitychange", onVisibilityChange);
  ```
- [ ] 1.2 Define `onVisibilityChange()` as a module-scope function (not inline) so we can name it in stack traces
- [ ] 1.3 In the handler:
  - If `document.visibilityState === "visible"`: log and re-render
  - If `document.visibilityState === "hidden"`: log only (do nothing)

## 2. Client: implement the throttled re-render

- [ ] 2.1 Module-scope state: `var lastVisibilityAt = 0;` and `var reinitInFlight = false;`
- [ ] 2.2 In the visible handler:
  - If `Date.now() - lastVisibilityAt < 500`: log "throttled" and return
  - Set `lastVisibilityAt = Date.now()`
  - If `reinitInFlight`: log "skipped (in-flight)" and return
  - Set `reinitInFlight = true`
  - Call the existing `init()` (or `refreshCurrentTab()` if a soft path exists) inside a try/finally that resets `reinitInFlight`
- [ ] 2.3 Log on every event: `log("visibilitychange state=" + document.visibilityState + " action=" + action)` where `action` is `reinit` / `throttled` / `skipped` / `none`

## 3. Verify the existing init / refresh path

- [ ] 3.1 Read `app.ts` and find the main init function (`init`, `bootstrap`, `start`, or whatever it is named in this codebase)
- [ ] 3.2 Confirm it is idempotent — calling it twice does not double-render or leak listeners
- [ ] 3.3 If a `refreshCurrentTab()` or similar soft-render path exists, prefer it for the visibility handler (full `init()` only if the soft path errors)
- [ ] 3.4 Document the chosen path in the PR description

## 4. Manual testing on real devices

- [ ] 4.1 iOS Safari (iPhone 13 or newer): open the app, tap a share link, tap Back, verify the app re-renders without manual refresh. Watch the debug panel for the `visibilitychange` log.
- [ ] 4.2 iOS Reddit app: same as 4.1 but inside the Reddit app's webview
- [ ] 4.3 Android Chrome: same test, verify the fix does not regress the working case
- [ ] 4.4 Android Reddit app: same test
- [ ] 4.5 Desktop Reddit: same test, verify the fix is a no-op (desktop does not have this bug, but the fix should not break it)

## 5. Edge case handling

- [ ] 5.1 User backgrounds the tab for 10 minutes, returns: re-init should fire (long absence = full re-init is safer than soft render)
- [ ] 5.2 User rapid-focus-blur-focus: second focus should be throttled, not re-init
- [ ] 5.3 User navigates within the app (not via `navigateTo`): the handler should still fire (visibility changes from opening an in-app overlay are not a problem; the re-init is harmless)
- [ ] 5.4 User has the debug panel open: the `log()` output should be visible immediately on return (no buffering)

## 6. Logging & Polish

- [ ] 6.1 Add `log()` calls at every changed path per §0.2
- [ ] 6.2 Run `npm run build`, `npm test`, `npm run type-check`, `npm run lint`
- [ ] 6.3 Commit, push, create OpenSpec archive
