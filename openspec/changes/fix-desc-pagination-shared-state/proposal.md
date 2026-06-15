## Why

Three state records used for description pagination in `app.ts` are keyed by raw event ID:

- `descFullText: Record<string, string>` (line 17)
- `descPageIdx: Record<string, number>` (line 13)
- `descPageTotal: Record<string, number>` (line 14)

These are read and written by both the user-facing event details overlay AND the moderator event details overlay. Both overlays use the same `id` (the event ID) as the key.

If a mod opens the mod detail overlay for an event that the user is also viewing in the user detail overlay (e.g., a mod previewing before approving), the pagination state of the user overlay will be silently overwritten. Worse, navigating "next" in the mod overlay will appear to move pages in the user overlay (and vice versa).

## Priority: 2/5

## Status: proposed

## What Changes

- Introduce mod-namespaced state: `modDescFullText`, `modDescPageIdx`, `modDescPageTotal`.
- Update all mod detail handlers (around `app.ts:1898-1926`) to use the mod-namespaced records.
- Keep the user detail handlers using the existing `descFullText` / `descPageIdx` / `descPageTotal`.
- Add logging that identifies which namespace is being used in each handler.

## Capabilities

### New Capabilities
- `desc-pagination-namespacing`: Mod detail description pagination state uses a separate namespace from user detail pagination state.

### Modified Capabilities
- None.

## Impact

- `src/client/app.ts`: introduce 3 new global records; update mod handlers to use them.

## Code Sketch (after fix)

```ts
// Add at line 17:
var modDescFullText: Record<string, string> = {};
var modDescPageIdx: Record<string, number> = {};
var modDescPageTotal: Record<string, number> = {};

// In mod detail "open" handler (around line 1331):
modDescFullText[id] = descFull;
modDescPageIdx[id] = 0;
modDescPageTotal[id] = descFull.length > DESC_SHORT_LENGTH ? 99 : 1;

// In mod-detail-desc-next handler (line 1898):
log("mod-detail-desc-next id=" + id + " pageTotal=" + (modDescPageTotal[id] || 0));
// ... use modDescPageTotal[id], modDescPageIdx[id], modDescFullText[id]
slideTrack("mod-desc-track-" + id, cur, modDescPageTotal[id] || 1);
```

## Why 2/5

Edge case (mod + user both viewing same event in their respective overlays at the same time), and the visual symptom is just confused pagination. Doesn't cause data corruption. The fix is straightforward but touches 5–6 places in the code.
