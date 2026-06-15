## 🎨 v1.4.0 — Unified Card Shell UI (Stable Release)

A major UI consistency update. Home, Mod Dashboard, and My Stuff now share the same full-viewport card pattern that was already proven in the Event Details overlay. The app is snappy, stable, and ready to ship — from here on it's UI polish and new mod features.

### ✨ What's New

**Reusable Card Shell**
- New `.card-shell` CSS classes (`.card-shell-header`, `.card-shell-body`, `.card-shell-actions`, `.card-shell-footer`) + `.card-progress` dots.
- New JS helpers: `buildCardShell()`, `updateCardDots()`, `updateCardNav()`.
- Absolute-positioned cards (`position:absolute; top:0; left:0; right:0; bottom:0`) for iOS Safari safety.

**Home Page**
- Full-viewport event card using flex layout — fills the available height exactly, no empty space.
- Fixed footer bar with Prev / Next / counter (`1/5`).
- Compact progress dots at the top of the card.
- Bigger title, emoji, and meta blocks for higher visual impact.
- Bordered description preview (medium length, per design choice).
- Action row: **View Details →** + **🎟️ RSVP** (or **✅ Going**) + optional **📤** Share.

**Mod Dashboard**
- Fixed footer nav + progress dots for Pending / Published / Pitches.
- Tab-specific card colors preserved: **Pending** pink, **Pitches** yellow, **Published** white.
- Contextual actions per tab:
  - Pending: **✅ Approve** / **🗑️ Decline**
  - Published: **👁️ View Details →** / **👥 Attendees** / **🗑️ Delete Event**
  - Pitches: **🗑️ Dismiss**
- Long locations truncate to one line with ellipsis so the header stays compact.
- Published tab now uses the same scrollable description box as Pending/Pitches — actions and footer stay anchored at the bottom.

**My Stuff**
- Unified card shell across RSVPs, My Events, and Pitches.
- Progress dots show item position.
- Footer prev/next styled consistently with Home/Mod.
- All existing bounce guards, optimistic updates, and action locks preserved.

### 🔧 Plumbing
- `#events-container` uses `flex: 1; min-height: 0` inside a flex column `.container` (no more magic `calc(100vh - 170px)`).
- `updateCardDots()` now supports class-based selectors (`.card-progress.{prefix}-dots`) for embedded dots, with id-based fallback for Home/My Stuff.
- OpenSpec change tracking: `.opencode/` config + `openspec/changes/unified-card-shell-ui/` (proposal, design, spec, tasks).

### 📐 Logging Principle (§0.2)
Every changed path gets a `log()` call:
- `[HOME] layout=full-viewport-flex shell=card-shell`
- `[MOD] metadata location truncated tab=<tab>`
- `[MOD] header dots embedded tab=<tab>`
- `[MOD] description box tab=<tab>`
- `[HELPER] updateCardDots / updateCardNav / buildCardShell` entry logs

### 📚 LEARNINGS
- §38 — Unified Card Shell UI Pattern documented in `LEARNINGS.md`.

### ✅ Verification
- `npm run build` — passes
- `npm test` — 6/6 pass
- `npm run type-check` — passes
- No `console.log` additions, no inline `onclick` handlers
- All event delegation preserved via `data-action`

### 📦 Files Changed
- `public/app.html` — 22 lines (card shell CSS, container flex layout, removed standalone mod dots row)
- `src/client/app.ts` — +299 / -120 lines (shell helpers, refactored render functions, embedded dots, location truncation, §0.2 logging)
- `LEARNINGS.md` — §38 added
- OpenSpec change artifacts (proposal, design, spec, tasks)

### 🚀 From Here
This is a stable baseline. Future work is:
- **UI polish**: typography, spacing, transitions, edge-case responsiveness.
- **New mod features**: bulk approve, edit event after submission, attendee preview, RSVP capacity limits.

---

**Compare:** https://github.com/darelphilipo/meetit/compare/v1.3.3...v1.4.0
