# Design — e20 Home Filter Past Events

## Context

The user reported: "there's an event for today 18-06 that shows first then on the next card i see an event that says <1 hr to go". After a v2 attempt that sorted past events to the END (so they're still visible but never block upcoming events), the user reverted: "i never wanted to show past events on the homepage". The final behavior is the original e20 v1: past events are hidden entirely from the home view.

## Decisions

### D1. Filter past events in `flattenHomeEvents` after sorting

Current code (`app.ts:296-323`, e20 v2 — to be reverted):
```ts
function flattenHomeEvents(eventsByDate: Record<string, any[]>): any[] {
  var all: any[] = [];
  var dates = Object.keys(eventsByDate).sort();
  for (var i = 0; i < dates.length; i++) {
    var evts = eventsByDate[dates[i] || ""] || [];
    for (var j = 0; j < evts.length; j++) all.push({ ...evts[j], _date: dates[i] });
  }
  // e19 D1 + e20 v2 D1: upcoming events ascending, past events descending...
  var now = Date.now();
  all.sort(function (a, b) {
    var aStart = (a._date && a.time) ? new Date(a._date + "T" + a.time + ":00").getTime() : 0;
    var bStart = (b._date && b.time) ? new Date(b._date + "T" + b.time + ":00").getTime() : 0;
    var aIsFuture = aStart >= now;
    var bIsFuture = bStart >= now;
    if (aIsFuture && !bIsFuture) return -1;
    if (!aIsFuture && bIsFuture) return 1;
    if (aIsFuture && bIsFuture) return aStart - bStart;
    return bStart - aStart;
  });
  var futureCount = ...;
  log("flattenHomeEvents sorted ...");
  return all;
}
```

**Reverted to (e20 v1):**
```ts
function flattenHomeEvents(eventsByDate: Record<string, any[]>): any[] {
  var all: any[] = [];
  var dates = Object.keys(eventsByDate).sort();
  for (var i = 0; i < dates.length; i++) {
    var evts = eventsByDate[dates[i] || ""] || [];
    for (var j = 0; j < evts.length; j++) all.push({ ...evts[j], _date: dates[i] });
  }
  // e19 D1: sort by (date, time) so the home card always displays events in
  // chronological order, regardless of server state. Defensive — the server
  // already sorts in getActiveEvents / getAllApprovedEvents, but this guards
  // against any future change that breaks the contract.
  all.sort(function (a, b) {
    var dc = (a._date || "").localeCompare(b._date || "");
    if (dc !== 0) return dc;
    return (a.time || "").localeCompare(b.time || "");
  });
  // e20 D1: filter out events that have already started. The home view should
  // only show upcoming events. An event that started earlier today would
  // otherwise sort first (because it has an earlier start time) and push the
  // real next event off the first slot.
  var now = Date.now();
  all = all.filter(function (event) {
    if (!event._date || !event.time) return true; // keep if data is missing
    var eventStart = new Date(event._date + "T" + event.time + ":00").getTime();
    return eventStart >= now;
  });
  log("flattenHomeEvents sorted " + all.length + " future events by (date, time) firstDate=" + (all[0]?._date || "n/a") + " firstTime=" + (all[0]?.time || "n/a"));
  return all;
}
```

**Why revert to filter, not sort-to-end?** The user explicitly reverted: "i never wanted to show past events on the homepage". Past events are confusing on the home view (they look "upcoming" with the "Today" label) and the user prefers them hidden entirely.

**Why after sort?** Filter after sort so the first card is always the soonest future event.

**Why keep events with missing data?** Defensive — if a legacy event has no time, we don't want to hide it. The existing code path (no countdown, just date text) handles this gracefully.

**Why client-side, not server-side?** Matches the e19 pattern (defensive client sort). The server's `getActiveEvents` is a single function used by other potential callers; changing it could affect them. Client filter is targeted to the home view only.

### D2. `loadHome` already handles the case where the current event is filtered out

`loadHome` (line 273-283) already handles this:
```ts
if (currentId) {
  var updatedIndex = allEvents.findIndex(function (event) { return event.id === currentId; });
  if (updatedIndex >= 0) homeCardIdx = updatedIndex;
  else if (homeCardIdx >= allEvents.length) homeCardIdx = Math.max(0, allEvents.length - 1);
}
```

If the user's current event was filtered out, `findIndex` returns -1, and `homeCardIdx` is set to the last event. The user is moved to a different (future) event. This is correct behavior.

**No change needed** in `loadHome`.

## Risks

| Risk | Mitigation |
|---|---|
| User's current event is filtered out (e.g., event started while they were viewing) | `loadHome` line 281-283 handles this — moves the user to the last event. Re-render shows the new event. |
| Event "starts" exactly at the filter time (boundary case) | `eventStart >= now` includes events that start exactly now. So an event starting at this exact moment stays visible. |
| Events with missing `time` field (legacy data) | The filter returns `true` for these (keeps them). They show the regular "Today" or "Tomorrow" text. No regression. |
| Race condition — event becomes past mid-session | `flattenHomeEvents` is called on every `loadHome` (debounced 300ms). If an event becomes past between renders, the next `loadHome` removes it. The user is moved to a new event. Acceptable. |
| Different timezones — event created in PST, viewed in IST | Existing timezone behavior. The event's `time` is parsed as the viewer's local time. The filter uses the same local-time parsing. Consistent. |
| Cache shows stale past events until the next `loadHome` | `cachedHomeEvents` is set from `flattenHomeEvents` output (line 277). The filter applies. The cache is always filtered. |

## Cross-cutting changes summary

- `app.ts` `flattenHomeEvents` (line 296-323) — restore the e20 v1 filter after the e19 sort
- No HTML changes
- No CSS changes
- No server changes
- No new dependencies
