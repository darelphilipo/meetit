## Why

Code quality items from the 2026-06-07 audit. None are critical, but they would improve maintainability and reduce technical debt.

- **CQ1:** `app.ts` is 2000+ lines with no modules/classes.
- **CQ2:** Many `var` declarations.
- **CQ3:** No error boundaries around render functions.
- **CQ4:** `handleAction` is a 50+ case switch.
- **CQ5:** `log()` also writes to `console.log` (no-op in Devvit).
- **CQ6:** `showToast` creates a new div each time, no z-index management.
- **CQ7:** `actionLocks` never cleaned up.
- **CQ8:** `CATEGORY_EMOJI` duplicated in `meetit.ts` and `app.ts`.
- **CQ9:** Duplicate `.container` CSS rule in `app.html` (already fixed in v1.3.0).
- **CQ10:** No `prefers-reduced-motion`.
- **CQ11:** No `prefers-color-scheme` (no dark mode).
- **CQ12:** No lint/format scripts.

## Priority: 1/5

## Status: future (low priority; app works well as-is)

## What Changes

- **CQ3:** Add try/catch around `renderHomeCard`, `renderModCard`, etc. with a fallback error state.
- **CQ5:** Remove the `console.log` fallback in `log()` (the debug panel is the only surface).
- **CQ7:** Add a periodic cleanup of `actionLocks` (TTL-based).
- **CQ8:** Import `CATEGORY_EMOJI` from `meetit.ts` in `app.ts` instead of duplicating.
- **CQ10:** Add `@media (prefers-reduced-motion: reduce)` to disable animations.
- **CQ12:** Add `eslint` and `prettier` config; add `lint` and `format` scripts.

## Out of Scope (deferred)

- **CQ1 (module split):** Major refactor; defer until app is feature-stable (which it is at v1.4.0). Could be revisited if the file crosses 3000 lines.
- **CQ2 (var → let):** Devvit Web targets modern browsers, but `var` works fine and is intentional for compatibility. Skip.
- **CQ4 (action map):** Major refactor; current switch is readable enough.
- **CQ6 (toast queue):** Current behavior is fine; rarely more than 1 toast at a time.
- **CQ11 (dark mode):** Major design effort; not requested.

## Capabilities

### New Capabilities
- `cq-polish-bundle`: Error boundaries, no-console cleanup, lock TTL, emoji dedup, reduced-motion, lint setup.

### Modified Capabilities
- None.

## Impact

- `src/client/app.ts`: error boundaries, CATEGORY_EMOJI import.
- `public/app.html`: reduced-motion media query.
- `package.json`: `lint` and `format` scripts.
- `.eslintrc.json`, `.prettierrc`: new config files.

## Why Low Priority

The app is stable and well-tested. These are nice-to-haves.
