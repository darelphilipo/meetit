## 1. devvit.json: add the setting

- [ ] 1.1 In `devvit.json:51-99` (the `settings.subreddit` block), add `show_debug_panel` after `use_brutalist_borders`:
  ```json
  "show_debug_panel": {
    "type": "boolean",
    "label": "Show Debug Log Panel (mods only)",
    "helpText": "Off by default. When enabled, mods see a 🐛 button to open the in-app debug log panel (server logs merged with client logs).",
    "defaultValue": false
  }
  ```

## 2. Server: read the setting in getSettings()

- [ ] 2.1 In `src/server/server.ts:224-242` `getSettings()`, add `settings.get("show_debug_panel")` to the `Promise.all` array.
- [ ] 2.2 Add `show_debug_panel: (showDebugPanel as boolean) === true` to the returned object (default `false`).
- [ ] 2.3 Add a `console.log("[SETTINGS] show_debug_panel=" + value)` line inside the function so the value is observable in `devvit-cli logs`. (Match the existing pattern: a one-line log per read is too noisy; this is just one log when the function runs, which is on every `/api/init` and `/api/home` — acceptable for diagnostics.)

## 3. Type: AppSettings

- [ ] 3.1 In `src/shared/api.ts:31-36`, add `show_debug_panel: boolean;` to `AppSettings`.

## 4. Client: store + apply the setting

- [ ] 4.1 In `src/client/app.ts`, near the other `cached*` module vars (line 7-13 area), add `var cachedShowDebugPanel: boolean = false;`.
- [ ] 4.2 In the `/api/home` response handler (line ~325-327 where `cachedHomeIsMod = data.data.isMod` is set), also set `cachedShowDebugPanel = (data.data.settings && data.data.settings.show_debug_panel) === true;`.
- [ ] 4.3 In the `/api/init` response handler (line ~2579 where `cachedHomeIsMod = data.isMod` is set), also set `cachedShowDebugPanel = (data.settings && data.settings.show_debug_panel) === true;`.
- [ ] 4.4 In `applyDebugPanelVisibility()` (line 146-164), change the visibility condition to require BOTH `cachedHomeIsMod === true` AND `cachedShowDebugPanel === true`.
- [ ] 4.5 Update the log lines inside `applyDebugPanelVisibility()` to indicate which gate failed (e.g. `HIDING: isMod=YES, showDebugPanel=NO`).

## 5. Tests

- [ ] 5.1 In `tools/meetit-behavior.test.ts`, add 4 new test cases for the visibility matrix (these test the data shape, not the DOM — the DOM test is manual):
  - mod=true, setting=true → visibility decision = SHOW
  - mod=true, setting=false → visibility decision = HIDE
  - mod=false, setting=true → visibility decision = HIDE
  - mod=false, setting=false → visibility decision = HIDE
- [ ] 5.2 The cleanest approach: extract a pure `decideDebugPanelVisibility(isMod, showDebugPanelSetting): "show" | "hide"` helper into `meetit.ts` so it's unit-testable in isolation. Use it in `applyDebugPanelVisibility()`.

## 6. Verification

- [ ] 6.1 `npm test` — all existing 80 tests still pass; 4 new tests pass (80 → 84).
- [ ] 6.2 `npx openspec validate --all` — passes (44 → 45).
- [ ] 6.3 Manual playtest:
  - As mod on a fresh install, confirm the 🐛 button is HIDDEN.
  - Open App Installation Settings for the subreddit, flip `show_debug_panel` to `true`, save.
  - Refresh the app → the 🐛 button now appears.
  - Toggle off → refresh → 🐛 button hidden again.
  - As a non-mod, the button is hidden regardless of the setting.
- [ ] 6.4 Add Test 5 to `TEST_CASES.md` results table.
