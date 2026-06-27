## 1. Client: refetch on dismiss (not optimistic)

- [ ] 1.1 In `dismissIdea` (`src/client/app.ts:1777-1816`), after the server returns success, remove the optimistic splice + re-render block (lines 1799-1806).
- [ ] 1.2 Replace it with: `delete modTabCache["pitches"]; if (modScreen3 && modScreen3.classList.contains("active") && modTab === "pitches") { loadModTab("pitches"); }`.
- [ ] 1.3 Keep the lock (`isLocked`/`lock`/`unlock`), the `promptForReason` call, the `setBtnLoading` calls, the `showToast("Idea dismissed", "success")`, and the server call unchanged.
- [ ] 1.4 Add a `log("dismissIdea refetching pitches tab (was optimistic splice)")` before the `loadModTab` call so the new code path is observable in the in-app debug panel.
- [ ] 1.5 Add a `log("dismissIdea cache invalidated, cache hit on next load?=" + (modTabCache["pitches"] ? "yes" : "no"))` after the `delete` to confirm the cache delete took effect.

## 2. Verification

- [ ] 2.1 `npm test` — all existing 80 tests still pass (no new tests added).
- [ ] 2.2 `npx openspec validate --all` — passes (43 → 44, one new change).
- [ ] 2.3 Manual playtest (2 devices):
  - Device 1 (submitter): submit a pitch
  - Device 2 (mod): open Pitches tab → see 1 pitch
  - Device 2: click "🗑️ Dismiss" → reason "test" → confirm
  - **Verify**: Device 2 immediately shows the empty state with a "🗑️ View dismissed (1)" link below (proves the count was refetched, not stale)
  - Device 1: refresh My Stuff → see the dismissed pitch with "❌ Dismissed: test · on {date} · by u/{mod}"
- [ ] 2.4 Add step 4.11 to `TEST_CASES.md`: "After dismiss, immediately verify '🗑️ View dismissed (1)' link is visible (proves counts are fresh, not stale)."
