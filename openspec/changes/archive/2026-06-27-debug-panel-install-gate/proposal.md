## Why

The debug log panel 🐛 currently appears automatically for every moderator on every install. The visibility is gated only by `cachedHomeIsMod === true` (`applyDebugPanelVisibility` in `src/client/app.ts:146-164`). For a public-facing production install, this is too aggressive — most mods don't need to see the in-app debug panel day-to-day, and the panel exposes server logs (even if mod-gated, it's extra attack surface).

The fix is to move the visibility into a per-install App Installation Settings flag. The mod (or subreddit admin) explicitly opts in by flipping `show_debug_panel = true` in the subreddit's App Installation Settings page. Default is OFF, so the panel is hidden by default for every install.

The server-side `requireMod()` gate on `/api/server-logs` is unchanged — even if a non-mod bypasses the client-side check, the server returns 403. This is defense in depth: the new setting is a UX/visibility concern, not a security one.

## Priority: 1/5

## Status: proposed

## What Changes

- Add `show_debug_panel: boolean` to `devvit.json` settings (default `false`).
- Add `show_debug_panel: boolean` to the `AppSettings` type in `src/shared/api.ts`.
- `getSettings()` in `src/server/server.ts` reads the new setting and includes it in the returned object.
- A new module-level `cachedShowDebugPanel: boolean` in `src/client/app.ts` stores the value from the most recent `/api/home` or `/api/init` response.
- `applyDebugPanelVisibility()` requires `cachedHomeIsMod && cachedShowDebugPanel` to reveal the 🐛 button. Otherwise it stays hidden.
- The server-side `requireMod()` gate on `onServerLogs` is unchanged.

## Capabilities

### New Capabilities
- `debug-panel-install-gate`: The debug log panel is hidden by default and only visible when the mod enables the `show_debug_panel` App Installation Setting for the subreddit.

### Modified Capabilities
- None.

## Impact

- `devvit.json` (settings block, after `use_brutalist_borders`): add `show_debug_panel: { type: "boolean", label: "Show Debug Log Panel (mods only)", defaultValue: false, helpText: "Off by default. When enabled, mods see a 🐛 button to open the in-app debug log panel." }`.
- `src/shared/api.ts` (line 31-36 `AppSettings`): add `show_debug_panel: boolean`.
- `src/server/server.ts:224-242` `getSettings()`: read `settings.get("show_debug_panel")`, return as `show_debug_panel` field.
- `src/client/app.ts`: add `var cachedShowDebugPanel = false;` near the other `cached*` declarations. Update `applyDebugPanelVisibility()` (line 146-164) to gate on both flags. Set `cachedShowDebugPanel` from the `/api/home` and `/api/init` responses (alongside `cachedHomeIsMod`).
- `tools/meetit-behavior.test.ts`: 4 new test cases for the visibility matrix (mod+on, mod+off, non-mod+on, non-mod+off).
- `TEST_CASES.md`: add Test 5 to the results table.
- `openspec/changes/debug-panel-install-gate/specs/debug-panel-install-gate/spec.md`: new spec.

## Note

This is a UX/visibility change, not a security change. The server-side `requireMod()` gate is the actual security boundary; the new setting is just about whether the 🐛 button is rendered at all. Defaulting to OFF respects the "mod only sees what they need" principle and reduces the chance of accidentally exposing the panel in a future code change.
