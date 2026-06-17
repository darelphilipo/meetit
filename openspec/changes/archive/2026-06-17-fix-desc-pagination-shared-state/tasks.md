## 1. Add mod-namespaced state

- [x] 1.1 Add `modDescFullText`, `modDescPageIdx`, `modDescPageTotal` as Record<string, ...> at line 17 area
- [x] 1.2 Update the mod detail "open" handler (line 1331 area) to write to mod-namespaced state
- [x] 1.3 Update the mod detail "recompute" handler (line 1383 area, if any) to use mod-namespaced state

## 2. Update mod handlers

- [x] 2.1 In `mod-detail-desc-next` (line 1898): use `modDescPageTotal[id]`, `modDescPageIdx[id]`, `modDescFullText[id]`
- [x] 2.2 In `mod-detail-desc-prev` (line 1922): use `modDescPageIdx[id]`
- [x] 2.3 Verify all `slideTrack("mod-desc-track-" + id, ...)` calls still work

## 3. Logging

- [x] 3.1 Add `log("mod-detail-desc-set id={id} total={n}")` when first computing pages
- [x] 3.2 Keep existing `log("mod-detail-desc-next id={id} ...")` etc.

## 4. Test

- [x] 4.1 Open user detail for event A, paginate to page 2
- [x] 4.2 Open mod detail for same event A — should start at page 1
- [x] 4.3 Paginate mod detail to page 3 — user detail should still be at page 2
- [x] 4.4 Close mod detail — user detail still at page 2

## 5. Polish

- [x] 5.1 Run `npm run build`, `npm test`, `npm run type-check`
- [x] 5.2 Commit, push, `openspec archive fix-desc-pagination-shared-state`
