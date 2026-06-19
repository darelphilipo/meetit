# Tasks — e20 Home Filter Past Events

## 1. Filter Past Events from Home View

- [x] 1.1 In `flattenHomeEvents`, add filter: `eventStart >= now` to hide events already started
- [x] 1.2 The sort is the e19 sort (`localeCompare` on date+time) — stays as-is
- [x] 1.3 Filter only applies to events with both `_date` and `time` set (events with missing data pass through)
- [x] 1.4 Log: `log("flattenHomeEvents sorted " + all.length + " future events by (date, time) ...")`
- [x] 1.5 `loadHome` handles filtered-out current event via `findIndex` returning -1
- [x] 1.6 `cachedHomeEvents` and `searchFilteredEvents` both pick up the filter automatically

## 2. Logging, Build, Verify

- [x] 2.1 Log added per LEARNINGS §0.2
- [x] 2.2 `npm run type-check` — passes
- [x] 2.3 `npm run build` — passes
- [x] 2.4 `npm test` — passes
- [x] 2.5 Shipped in v1.6.3 (commit `a71feb6`)

## Notes

- v2 (3-bucket sort with past events at end) was attempted, tested, and **reverted** per user request. User explicitly said: "i never wanted to show past events on the homepage. revert back."
- Current behavior: past events hidden entirely from home view.
