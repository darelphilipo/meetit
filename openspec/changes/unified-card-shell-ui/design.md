## Context

Meetit currently has four distinct card/overlay patterns:
- **Home**: content-height inline card with prev/next buttons inside the card.
- **Event Details overlay**: fixed header, progress dots, full-viewport body, fixed footer nav — the most consistent pattern.
- **My Stuff overlay**: fixed header + footer, full-viewport body, but no progress dots and a different inner card structure.
- **Mod Dashboard overlay**: fixed header + tabs, but body flows in padding, prev/next are inside cards, and there is no footer shell.

This inconsistency makes the app feel patched together and wastes mobile viewport space.

## Goals / Non-Goals

**Goals:**
- Unify Home, Mod Dashboard, and My Stuff on the Event Details overlay shell.
- Use the full mobile viewport for the main event card on all browse views.
- Add progress dots to all item-carousels (Home, Mod Dashboard, My Stuff).
- Move prev/next navigation to a fixed footer in Mod Dashboard and style it consistently in Home/My Stuff.
- Keep tab-specific card colors and action buttons.
- Preserve all existing guards: stale-response rejection, optimistic updates, action locks.

**Non-Goals:**
- No API or server changes.
- No new data models.
- No changes to Create Event / Pitch / RSVP / Confirm overlays.
- No changes to the 4-step Event Details or Mod Event Details overlays (they already match the target pattern).

## Decisions

1. **Single reusable card shell**
   - Create `.card-shell`, `.card-shell-header`, `.card-shell-body`, `.card-shell-actions`, `.card-shell-footer` CSS classes.
   - Create a `buildCardShell()` helper in `src/client/app.ts` so all three views generate the same outer structure.
   - Rationale: avoids copy-paste, makes future UI changes one-edit.

2. **Absolute positioning for full-height cards**
   - `.card-shell` uses `position:absolute; top:0; left:0; right:0; bottom:0` inside a relative container.
   - Rationale: iOS Safari treats `height:100%` inside flex as `auto`; absolute positioning is the known-safe pattern (LEARNINGS.md §21).

3. **Progress dots live in the shell header area**
   - Added as a row below the section header, distinct from the 4-step wizard dots.
   - Rationale: gives users immediate position feedback without confusing item carousels with step wizards.

4. **Tab-specific colors preserved**
   - Pending cards use pink background, Pitches use yellow, Published/My Stuff/Home use white/cream.
   - Rationale: colors are a useful status cue; unifying structure does not require flattening identity.

5. **Footer actions are contextual, not universal**
   - Home: View Details + RSVP.
   - Mod Pending: Approve + Decline.
   - Mod Published: View Details + Attendees + Delete.
   - Mod Pitches: Dismiss.
   - My Stuff RSVPs: Update Contact + Leave.
   - My Stuff Events: Cancel/Delete by status.
   - My Stuff Pitches: Delete.
   - Rationale: each context has different primary tasks; a one-size-fits-all action bar would add noise.

## Risks / Trade-offs

- **[Risk] Existing event delegation selectors break if button classes/IDs change.** → Mitigation: keep existing `data-action` values and add new ones only where needed. Run full behavior tests after each phase.
- **[Risk] Absolute-fill cards hide content on very small viewports.** → Mitigation: make the body `flex:1; min-height:0; overflow:hidden` and internal content scrollable, same as Event Details.
- **[Risk] My Stuff bounce/leave guards depend on overlay state checks.** → Mitigation: preserve all existing `myStuffOverlay.classList.contains("active")` guards; log each branch.
- **[Risk] Mod dashboard attendee overlay (`mod-attendees-overlay`) is separate and may feel inconsistent.** → Mitigation: out of scope for this change; revisit later.

## Migration Plan

Deploy in 5 separate commits/phases:
1. Card shell foundation (CSS + helper, no visible changes).
2. Home page redesign.
3. Mod Dashboard redesign.
4. My Stuff redesign.
5. Polish + build + tests + deploy.

Rollback: revert the relevant commit; no data migration needed.

## Open Questions

- None remaining; all decisions confirmed by user in planning thread.
