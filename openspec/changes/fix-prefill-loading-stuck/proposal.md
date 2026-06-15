## Why

Two loading flags in `app.ts` can get stuck `true` if the async work they guard throws an error:

1. **`prefillLoading`** (`app.ts:1765-1766`) — guards the organizer-field auto-fill. If the `/api/init` fetch throws, the flag is never reset and the organizer field never auto-fills again that session.

2. **`myStuffLoading`** (`app.ts:420, 468`) — guards the My Stuff submissions load. The flag is set to `false` AFTER the try/catch (line 468), so if the catch block itself throws (e.g., `container.innerHTML` fails because the element is null), the flag stays true and the user can't re-trigger the load.

Both bugs are silent — no UI feedback, no error visible to the user. The session just has a permanently broken feature.

## Priority: 3/5

## Status: proposed

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

## Why 3/5

These bugs leave the user with a silently broken feature until they reload the app. The fix is a 5-line try/finally refactor. Important but not blocking major work.
