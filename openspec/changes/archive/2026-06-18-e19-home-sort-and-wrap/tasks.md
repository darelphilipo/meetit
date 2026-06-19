# Tasks — e19 Home Sort + Wrap-Around

## 1. Sort Home Events by Occurrence Time

- [x] 1.1 Add `all.sort((a, b) => (a._date || "").localeCompare(b._date || "") || (a.time || "").localeCompare(b.time || ""))` in `flattenHomeEvents` (`app.ts:307-311`)
- [x] 1.2 Manual verify: events are displayed in chronological order, soonest first

## 2. Wrap-Around Prev/Next Navigation

- [x] 2.1 Add `wrap: boolean = false` parameter to `updateCardNav()` (`app.ts:231`)
- [x] 2.2 When `wrap === true`, show both prev/next buttons when `total > 1` (no clamping at boundaries)
- [x] 2.3 Call `updateCardNav("home", ..., true)` from `renderHomeCard` (`app.ts:408`)
- [x] 2.4 Mod dashboard and My Stuff continue calling with `wrap=false` (default) — no behavior change
- [x] 2.5 Manual verify: on last event, pressing Next wraps to first event; on first event, pressing Prev wraps to last

## 3. Build & Ship

- [x] 3.1 `npm run type-check` — passes
- [x] 3.2 `npm test` — passes
- [x] 3.3 `npm run build` — passes
- [x] 3.4 Shipped in v1.6.3 (commit `a71feb6`)
