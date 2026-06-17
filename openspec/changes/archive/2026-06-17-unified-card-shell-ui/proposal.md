## Why

The Meetit app currently uses inconsistent card layouts across Home, Mod Dashboard, and My Stuff: Home cards are content-height with inline prev/next, the Mod Dashboard has no fixed footer and embeds navigation inside cards, and My Stuff lacks progress dots. This creates a fragmented mobile experience. We need to unify all browse/carousel views on the same fixed-header + progress-dots + full-viewport card + fixed-footer-nav pattern already proven in the Event Details overlay.

## What Changes

- Introduce a reusable **card shell** component (CSS + JS helper) used by Home, Mod Dashboard, and My Stuff.
- Redesign **Home** to use a full-viewport event card with fixed footer navigation and progress dots.
- Redesign **Mod Dashboard** to use the card shell with a fixed footer, progress dots, and tab-specific action rows (Approve/Decline, View Details/Attendees/Delete, Dismiss).
- Redesign **My Stuff** to use the card shell with progress dots and tab-specific actions (Update Contact/Leave, Cancel/Delete, Delete).
- Keep tab-specific card colors: pink for Pending, white for Published, yellow for Pitches.
- Preserve all existing optimistic updates, stale-response guards, and action locks.
- Add logging at every changed path per LEARNINGS.md §0.2.

## Capabilities

### New Capabilities
- `unified-card-shell-ui`: Reusable full-viewport card shell with fixed header, progress dots, scrollable body, fixed footer nav, and tab-specific action rows for Home, Mod Dashboard, and My Stuff.

### Modified Capabilities
- None (this is a pure UI/UX refactor; no API or data behavior changes).

## Impact

- `public/app.html`: new card shell CSS classes.
- `src/client/app.ts`: refactor `renderHomeCard`, `renderModCard`, `renderMyRsvpCard`, `renderMyEventCard`, `renderMyPitchCard`; add shell helpers.
- `LEARNINGS.md`: add §0.2 logging for new helpers.
- No server or API changes.
- No breaking changes to user data or public behavior.
