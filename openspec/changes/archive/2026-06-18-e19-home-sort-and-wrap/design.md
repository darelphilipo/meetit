# Design — e19 Home Page Sort + Wrap-Around

## Context

The user reported two home-page UX issues:

1. **Sort by occurrence time:** "if an event is in next 10hrs, that should be the first to display compared to an event that's happening in the next 24 hrs"
2. **Wrap-around:** "the home page event card scroll should round back to the first event after the last event"

Both are small, surgical changes to the home card's data + navigation layer.

## Decisions

### D1. Sort in `flattenHomeEvents` after building the flat array

Current code (`app.ts:289-297`):
```ts
function flattenHomeEvents(eventsByDate: Record<string, any[]>): any[] {
  var all: any[] = [];
  var dates = Object.keys(eventsByDate).sort();
  for (var i = 0; i < dates.length; i++) {
    var evts = eventsByDate[dates[i] || ""] || [];
    for (var j = 0; j < evts.length; j++) all.push({ ...evts[j], _date: dates[i] });
  }
  return all;
}
```

**Fixed:**
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
  return all;
}
```

**Why defensive?** The server's `getActiveEvents` (line 233 of `server.ts`) and `getAllApprovedEvents` (line 239) already sort by `(a.date.localeCompare(b.date) || a.time.localeCompare(b.time))`. But the client should not depend on this contract. If a future change adds a new endpoint that returns unsorted events, the home card will still display correctly.

**Why sort the flat array, not within each date bucket?** Both approaches work. Sorting the flat array is one operation, simpler, and the result is guaranteed correct regardless of how the buckets were built.

**Tie-breaker:** when two events have the same `(date, time)`, JavaScript's `Array.prototype.sort` is stable in modern engines (Node 12+, all major browsers). So the original insertion order is preserved — no need for an explicit id-based tie-breaker.

### D2. Add `wrap` parameter to `updateCardNav`

Current code (`app.ts:231-243`):
```ts
function updateCardNav(prefix: string, current: number, total: number) {
  log("updateCardNav prefix=" + prefix + " current=" + current + " total=" + total);
  var prevBtn = document.getElementById(prefix + "-prev-btn");
  var nextBtn = document.getElementById(prefix + "-next-btn");
  if (!prevBtn || !nextBtn) { log("updateCardNav buttons not found prefix=" + prefix); return; }
  if (total <= 1) {
    prevBtn.classList.add("hidden");
    nextBtn.classList.add("hidden");
    return;
  }
  prevBtn.classList.toggle("hidden", current === 0);
  nextBtn.classList.toggle("hidden", current >= total - 1);
}
```

**Fixed:**
```ts
function updateCardNav(prefix: string, current: number, total: number, wrap: boolean = false) {
  log("updateCardNav prefix=" + prefix + " current=" + current + " total=" + total + " wrap=" + wrap);
  var prevBtn = document.getElementById(prefix + "-prev-btn");
  var nextBtn = document.getElementById(prefix + "-next-btn");
  if (!prevBtn || !nextBtn) { log("updateCardNav buttons not found prefix=" + prefix); return; }
  if (total <= 1) {
    prevBtn.classList.add("hidden");
    nextBtn.classList.add("hidden");
    return;
  }
  if (wrap) {
    // e19 D2: wrap-around mode — both buttons always visible when total > 1
    prevBtn.classList.remove("hidden");
    nextBtn.classList.remove("hidden");
  } else {
    // Default: hide buttons at boundaries (clamps, used by my-stuff / mod-dashboard)
    prevBtn.classList.toggle("hidden", current === 0);
    nextBtn.classList.toggle("hidden", current >= total - 1);
  }
}
```

**Why a parameter, not a separate function?** `updateCardNav` is a small helper. A parameter keeps the call site (`renderHomeCard`) clean and makes the behavior obvious from the call.

**Default `false`** — preserves existing behavior for all 5 call sites that don't pass `wrap` (my-stuff events, my-stuff pitches, my-stuff rsvps, mod-dashboard pending/published/pitches).

### D3. Pass `wrap=true` from `renderHomeCard`

Current code (`app.ts:381`):
```ts
updateCardNav("home", homeCardIdx, count);
```

**Fixed:**
```ts
updateCardNav("home", homeCardIdx, count, true);
```

Only one call site changes. The dot indicator (`updateCardDots`) is unchanged — it still shows the current position with `done` class, so wrapping from last (idx=N-1) to first (idx=0) correctly moves the highlight to the first dot.

### D4. Verify modulo math in `homePrev` / `homeNext` is correct

**No change needed.** Current code (`app.ts:385-386`):
```ts
function homePrev() { var events = searchFilteredEvents || cachedHomeEvents; log("homePrev idx=" + homeCardIdx + " total=" + events.length); if (events.length > 1) { homeCardIdx = (homeCardIdx - 1 + events.length) % events.length; log("homePrev newIdx=" + homeCardIdx); renderHomeCard({ eventsByDate: groupByDate(events), isMod: cachedHomeIsMod, settings: {} }, { noFade: true }); } }
function homeNext() { var events = searchFilteredEvents || cachedHomeEvents; log("homeNext idx=" + homeCardIdx + " total=" + events.length); if (events.length > 1) { homeCardIdx = (homeCardIdx + 1) % events.length; log("homeNext newIdx=" + homeCardIdx); renderHomeCard({ eventsByDate: groupByDate(events), isMod: cachedHomeIsMod, settings: {} }, { noFade: true }); } }
```

Walkthrough with `total=3`:
- `homeCardIdx=2` (last), user clicks Next: `(2+1) % 3 = 0` ✓ wraps to first
- `homeCardIdx=0` (first), user clicks Prev: `(0-1+3) % 3 = 2` ✓ wraps to last

**Edge case: 2 events.** `homeCardIdx=0` Prev: `(0-1+2) % 2 = 1` ✓. `homeCardIdx=1` Next: `(1+1) % 2 = 0` ✓.

**Edge case: 1 event.** `if (events.length > 1)` guard prevents wrap (correct, no wrap with 1 event).

Math is correct. The only blocker was the UI hiding the buttons — D2/D3 unblock it.

## Risks

| Risk | Mitigation |
|---|---|
| Sorting the flat array changes the order of `cachedHomeEvents` | `cachedHomeEvents` is a module-level array used by `homePrev`/`homeNext`. Sorting it on every `flattenHomeEvents` call (which happens on every render) is correct — the user always sees the same chronological order regardless of when they navigated. |
| My Stuff / mod-dashboard navigation accidentally wraps | D2 default is `false`. D3 only changes the home card's call site. The 5 other call sites are untouched. |
| Dot indicator gets out of sync with wrapped position | `updateCardDots` runs AFTER `homeCardIdx` is updated (line 380 of `renderHomeCard`). The new `homeCardIdx=0` from wrap-around correctly highlights the first dot. |
| Sort changes home card's "current event" identity | `homeCardIdx` is preserved across re-renders. Only the underlying events array is re-sorted. The user stays on the same event. |
| Tie-breaking when two events have identical (date, time) | JS sort is stable in modern engines. The original order is preserved — same as before. No regression. |
| Search filter integration (`searchFilteredEvents`) | The filtered list is also flattened via `flattenHomeEvents` (via `groupByDate(events)` in `homePrev`/`homeNext` at line 385-386), so the sort applies to filtered results too. |

## Cross-cutting changes summary

- `app.ts` `flattenHomeEvents` (line 289-297) — add sort after building the flat array
- `app.ts` `updateCardNav` (line 231-243) — add `wrap` parameter; preserve default clamp behavior
- `app.ts` `renderHomeCard` (line 381) — pass `wrap=true` to `updateCardNav`
- No HTML changes
- No CSS changes
- No server changes
- No new dependencies
