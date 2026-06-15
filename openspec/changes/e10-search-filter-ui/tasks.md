## 1. Search Bar

- [ ] 1.1 Add `<input type="search" id="home-search" placeholder="🔍 Search events...">` to home screen
- [ ] 1.2 Style: full width, padded, visible only when toggle is on
- [ ] 1.3 Wire `oninput` to `filterHomeEvents(searchTerm, selectedCategory)`

## 2. Category Pills

- [ ] 2.1 Add `<div id="home-category-pills" class="category-pills">` below search bar
- [ ] 2.2 Render one pill per category from `CATEGORY_EMOJI` + "All" pill
- [ ] 2.3 `data-category` attribute on each pill
- [ ] 2.4 Active pill has yellow background (per neo-brutalist palette)
- [ ] 2.5 `data-action="filter-category"` and `data-category={cat}` for delegation

## 3. Toggle Button

- [ ] 3.1 Add "🔍" button to home screen header (`data-action="toggle-home-search"`)
- [ ] 3.2 On click, toggle a `.home-search-active` class on the home screen
- [ ] 3.3 Search bar + pills are visible only when this class is present

## 4. Filter Logic

- [ ] 4.1 `filterHomeEvents(searchTerm, category)`:
  - Filter `cachedHomeEvents` by title contains `searchTerm` (case-insensitive)
  - Filter by category equals `category` (or pass-through if "All")
  - Update `homeCardIdx` to 0
  - Re-render home card
  - Hide dots and nav if only 1 result, or update them if multiple
- [ ] 4.2 Log `log("filter-home search='" + term + "' category='" + cat + "' results=" + filtered.length)`

## 5. State Persistence

- [ ] 5.1 Save current search/category in `homeFilter` global
- [ ] 5.2 On `loadHome()`, re-apply current filter after fetch
- [ ] 5.3 On `refresh-home`, re-apply filter

## 6. Logging & Polish

- [ ] 6.1 Add `log()` calls at every changed path per §0.2
- [ ] 6.2 Update LEARNINGS.md
- [ ] 6.3 Run `npm run build`, `npm test`, `npm run type-check`
- [ ] 6.4 Commit, push, create OpenSpec archive
