# Tasks — e20 Home Filter Past Events

## 1. Filter Past Events from Home View

- [ ] 1.1 In `src/client/app.ts` `flattenHomeEvents` (line 296-323), replace the e20 v2 3-bucket sort with the e19 sort + e20 v1 filter (past events hidden)
- [ ] 1.2 The reverted sort is the e19 sort (localeCompare on date+time):
  ```ts
  all.sort(function (a, b) {
    var dc = (a._date || "").localeCompare(b._date || "");
    if (dc !== 0) return dc;
    return (a.time || "").localeCompare(b.time || "");
  });
  ```
- [ ] 1.3 The restored filter is the e20 v1 filter (past events hidden):
  ```ts
  var now = Date.now();
  all = all.filter(function (event) {
    if (!event._date || !event.time) return true; // keep events with missing data
    var eventStart = new Date(event._date + "T" + event.time + ":00").getTime();
    return eventStart >= now;
  });
  ```
- [ ] 1.4 Restore the original e20 v1 log line:
  ```ts
  log("flattenHomeEvents sorted " + all.length + " future events by (date, time) firstDate=" + (all[0]?._date || "n/a") + " firstTime=" + (all[0]?.time || "n/a"));
  ```
- [ ] 1.5 Verify `loadHome` (line 273-283) still handles the case where the current event is filtered out (it does — `findIndex` returns -1, `homeCardIdx` is set to the last event)
- [ ] 1.6 Verify `cachedHomeEvents` and `searchFilteredEvents` are both filtered (they're set from `flattenHomeEvents` output, so they pick up the filter automatically)

## 2. Logging, Build, Verify

- [ ] 2.1 Add `log()` calls at the changed path per LEARNINGS.md §0.2 (covered by 1.4)
- [ ] 2.2 Run `npm run type-check` — must pass
- [ ] 2.3 Run `npm run build` — must pass
- [ ] 2.4 Run `npm test` — must pass (no new tests required)
- [ ] 2.5 Manual verify: open home, confirm past events are hidden, only upcoming events show
- [ ] 2.6 Manual verify: on home, the soonest upcoming event is now in the first slot
- [ ] 2.7 Manual verify: wait until an event starts, refresh home — that event is no longer visible
- [ ] 2.8 Commit, push, create PR
- [ ] 2.9 `openspec archive e20-home-filter-past`
