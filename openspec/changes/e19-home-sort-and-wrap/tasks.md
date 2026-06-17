# Tasks — e19 Home Sort + Wrap-Around

## 1. Sort Home Events by Occurrence Time

- [ ] 1.1 In `src/client/app.ts` `flattenHomeEvents` (line 289-297), after the nested loop that builds the flat array, add an `all.sort(...)` call that compares by `(a._date, a.time)` then `(b._date, b.time)` using `localeCompare`. Use the existing pattern from the server's `getActiveEvents` (line 233 of `server.ts`): `a.date.localeCompare(b.date) || a.time.localeCompare(b.time)`. Add a `log()` per LEARNINGS §0.2: `log("flattenHomeEvents sorted " + all.length + " events by (date, time) firstDate=" + (all[0]?._date || "n/a") + " firstTime=" + (all[0]?.time || "n/a"))`
- [ ] 1.2 Verify the sort handles missing `time` field (treat as `""` so it sorts to the front of its date group). Test by adding `?.time || ""` in the comparator
- [ ] 1.3 Verify `cachedHomeEvents` and `searchFilteredEvents` are both re-sorted (they're set from the return of `flattenHomeEvents`, so they pick up the sort automatically)

## 2. Wrap-Around Prev/Next Buttons

- [ ] 2.1 In `src/client/app.ts` `updateCardNav` (line 231-243), add an optional 4th parameter `wrap: boolean = false`
- [ ] 2.2 In the function body, when `wrap=true` AND `total > 1`, force both `prevBtn` and `nextBtn` to be visible (remove the `hidden` class). When `wrap=false` (default), keep the existing boundary-hiding logic
- [ ] 2.3 Add a `log()` per LEARNINGS §0.2 that includes the `wrap` value: extend the existing `log("updateCardNav ...")` to append ` + " wrap=" + wrap`
- [ ] 2.4 In `renderHomeCard` (line 381), pass `true` as the 4th argument: `updateCardNav("home", homeCardIdx, count, true);`
- [ ] 2.5 Verify the modulo math in `homePrev` (line 385) and `homeNext` (line 386) is correct by reading the code — DO NOT CHANGE, just confirm. Walk through:
  - `homeCardIdx=N-1` (last) + Next → `(N-1+1) % N = 0` ✓
  - `homeCardIdx=0` (first) + Prev → `(0-1+N) % N = N-1` ✓
  - `total=1` is guarded by `if (events.length > 1)` ✓

## 3. Logging, Build, Verify

- [ ] 3.1 Add `log()` calls at every changed path per LEARNINGS.md §0.2 (covered by 1.1 and 2.3)
- [ ] 3.2 Run `npm run type-check` — must pass
- [ ] 3.3 Run `npm run build` — must pass
- [ ] 3.4 Run `npm test` — must pass (no new tests for this change)
- [ ] 3.5 Manual verify: open home, confirm events are in chronological order (soonest first)
- [ ] 3.6 Manual verify: on home, click Next until past the last event → wraps to first
- [ ] 3.7 Manual verify: on home, click Prev when on the first event → wraps to last
- [ ] 3.8 Manual verify: open My Stuff → Events, click Next on the last event → does NOT wrap (clamps, as before). This confirms `wrap` parameter is only active on the home card.
- [ ] 3.9 Commit, push, create PR
- [ ] 3.10 `openspec archive e19-home-sort-and-wrap`
