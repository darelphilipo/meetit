## Why

Two loading flags in `app.ts` can get stuck `true` if the async work they guard throws an error:

1. **`prefillLoading`** (`app.ts:1765-1766`) — guards the organizer-field auto-fill. If the `/api/init` fetch throws, the flag is never reset and the organizer field never auto-fills again that session.

2. **`myStuffLoading`** (`app.ts:420, 468`) — guards the My Stuff submissions load. The flag is set to `false` AFTER the try/catch (line 468), so if the catch block itself throws (e.g., `container.innerHTML` fails because the element is null), the flag stays true and the user can't re-trigger the load.

Both bugs are silent — no UI feedback, no error visible to the user. The session just has a permanently broken feature.

## Priority: 1/5

## Category: edge-enhancement

## Status: deprioritized (2026-06-17)

## What Changes

- Wrap `prefillOrganizer` in a try/finally block. The `prefillLoading = false` reset goes in the finally.
- Wrap `loadMySubmissions` in a try/finally block. The `myStuffLoading = false` reset goes in the finally.
- Add `log()` calls at entry, success, error, and finally-exit per LEARNINGS §0.2.

## Capabilities

### New Capabilities
- `prefill-loading-stuck`: Guarantee that loading flags reset on any error path, not just success.

### Modified Capabilities
- None.

## Impact

- `src/client/app.ts`: refactor `prefillOrganizer` (line 1766) and `loadMySubmissions` (line 456 area) to use try/finally.

## Code Sketch (after fix)

```ts
async function prefillOrganizer() {
  if (currentUsername) { /* set value, return */ }
  if (usernameCached) { /* set value, return */ }
  if (prefillLoading) return;
  prefillLoading = true;
  log("prefillOrganizer: fetching /api/init");
  try {
    var res = await fetch(API_BASE + "/api/init");
    var data = await res.json();
    if (data.type === "init" && data.username) { /* set value, cache */ }
    if (data.type === "init" && data.timezone) { setAppTimezone(data.timezone); }
    log("prefillOrganizer: success user=" + (data.username || "unknown"));
  } catch (e) {
    log("prefillOrganizer: error " + e);
  } finally {
    prefillLoading = false;
    log("prefillOrganizer: flag released");
  }
}
```

Same pattern for `loadMySubmissions`.

## Why 1/5 (deprioritized 2026-06-17)

**The current code already resets the flag on the caught error path.** The "stuck flag" claim is half-true.

Looking at the current `app.ts:1892` and `app.ts:461-483`, the structure is:

```ts
prefillLoading = true;
try { ... fetch ... } catch (e) { log(...); }
prefillLoading = false;  // runs unconditionally after try/catch
```

The `prefillLoading = false` line runs whether the try succeeded OR the catch caught an error. JS continues to the next statement after `catch` finishes. So the flag IS reset on the success path AND the caught error path today.

**The flag stays stuck only if the catch block itself throws.** For `prefillOrganizer`, the catch only does `log(...)`. For `loadMySubmissions`, the catch does `log(...)` and `container.innerHTML = '...'`. For either of these to throw, the DOM API would have to malfunction (e.g., `log` would have to throw, or the static `error-state` HTML would have to be malformed).

**This is a defensive refactor, not a bug fix.** The case for the change is consistency with the rest of the codebase's try/finally pattern (LEARNINGS §24.2, §47), not a confirmed bug. It's the right thing to do, but it's not fixing a reported user issue.

**Re-prioritize to 3/5** if:
- A user reports a stuck prefill or stuck My Stuff load
- We add a real try/finally mismatch in a future refactor (e.g., adding a new error path inside the try)
- We instrument the debug panel with a "stuck-flag" detector that flags this in real time

**Defensive merit:** The fix is small and clean (~4 lines per function). It costs nothing to ship and prevents a class of bugs from forming.
