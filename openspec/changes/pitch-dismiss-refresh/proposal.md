## Why

The `dismissIdea` client function (introduced in `pitch-feedback-loop`) uses an optimistic local update: it splices the dismissed pitch out of `modItems["pitches"]` and re-renders, but does NOT pass the updated `counts` to `renderModPitches`. Because `renderModPitches` only updates `modPitchesCounts` when a `counts` argument is provided, the count values stay stale after the dismiss.

Symptom: after a mod dismisses a pitch, the "🗑️ View dismissed (N)" link does not appear in the empty state because `modPitchesCounts.dismissed` is still `0` (the pre-dismiss value). The user sees the pitch correctly disappear from the list, but the dismissed link only appears after a subsequent tab switch, page refresh, or other action that triggers a full refetch.

This pattern was already audited in `LEARNINGS §35` (DC1 in `BUG_REGISTRY`), which recommended the `delete modTabCache[type] + loadModTab(type)` pattern that other destructive actions (`approveEvent`, `deleteEvent`) already use. The new optimistic-splice path in `pitch-feedback-loop` drifted from that pattern; this change restores it.

## Priority: 1/5

## Status: proposed

## What Changes

- In `dismissIdea` (`src/client/app.ts`), replace the optimistic splice + re-render block with `delete modTabCache["pitches"]; loadModTab("pitches");`. The mod's pitches view now refetches from the server after a successful dismiss, with the updated counts baked into the response. The dismissed pitch is correctly absent, and the "View dismissed (1)" link appears immediately.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `pitch-feedback-loop`: the mod dismiss action now refetches with fresh counts rather than relying on local optimistic state. The user-visible behavior of the dismiss action is unchanged, but the cross-filter counts are now correct immediately after the dismiss.

## Impact

- `src/client/app.ts:1777-1816` `dismissIdea`: remove the optimistic splice + re-render block (lines 1799-1806), replace with `delete modTabCache["pitches"]; if (modScreen3 && modScreen3.classList.contains("active") && modTab === "pitches") { loadModTab("pitches"); }`.
- `openspec/changes/pitch-dismiss-refresh/specs/pitch-dismiss-refresh/spec.md`: new spec.
- `TEST_CASES.md`: add a playtest step verifying the "View dismissed (1)" link is visible immediately after dismiss.

## Note

This is a one-file fix that aligns the dismiss flow with the established pattern. No new tests (the existing `dismissIdea` behavior is verified by the playtest), no new settings, no server changes. The ~200ms network round-trip is the cost of correctness — the optimistic update was a micro-optimization that was never actually saving time.
