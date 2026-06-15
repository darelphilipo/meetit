## Why

Performance polish items from the 2026-06-07 audit:

- **PERF4:** `renderHomeCard` does a full DOM rebuild on every Prev/Next.
- **PERF5:** `body::before` emoji pattern could cause rendering issues on low-end devices.
- **PERF6:** Google Fonts CDN could cause FOIT (Flash of Invisible Text).

## Priority: 2/5

## Status: proposed (bundle)

## What Changes

- **PERF4:** Replace `innerHTML` rebuilds with targeted DOM updates. Cache the metadata element, update text/classes only. (Big refactor; could split into its own change.)
- **PERF5:** Reduce emoji count in `body::before` from ~20 to ~5, or use a static background image.
- **PERF6:** Add `font-display: swap` to font loading.

## Out of Scope

- Full virtual-DOM implementation. Stick to targeted updates for known-changing elements.

## Capabilities

### New Capabilities
- `perf-polish-bundle`: Targeted DOM updates for home card nav; reduced background emoji density; `font-display: swap`.

### Modified Capabilities
- None.

## Impact

- `public/app.html`: `body::before` emoji count, font loading.
- `src/client/app.ts`: targeted DOM updates in `renderHomeCard` (or a refactor of nav to update only the changed text/classes).

## Why Low Priority

- PERF4: the current full rebuild is fast enough for <50 events.
- PERF5: the emoji pattern is a stylistic choice; rendering is fine on modern devices.
- PERF6: cosmetic, doesn't break functionality.
