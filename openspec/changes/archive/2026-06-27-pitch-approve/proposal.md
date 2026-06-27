## Why

Today, when a mod looks at the Pitches tab, they can only dismiss a pitch. There's no way to say "yes, this is a good idea" — they have to dismiss (negative signal to the pitcher) or leave it pending forever. The pitcher who submitted the idea has no idea whether anyone saw it or thought it was good.

The minimal fix: add an Approve action parallel to Dismiss. When a mod approves, the pitch is soft-saved with `status="approved"` and a best-effort DM goes to the pitcher saying "your pitch was approved, ready to submit as an event?" The DM is the key user-visible addition — without it, the mod's "approve" is just a status change and the pitcher never knows.

This is a go-ahead signal, NOT an event creation. The pitcher still has to submit the event through the normal Create flow. This is the minimum viable "approve" that:
- gives the mod a positive action (so they don't have to use Dismiss for "yes")
- tells the pitcher the mod thought it was a good idea
- keeps the existing event-submission flow intact (no auto-creation, no schema migration)

## Priority: 1/5

## Status: proposed

## What Changes

- New `POST /api/approve-idea` endpoint, mod-gated. Writes the pitch back with `status="approved"`, `approvedAt`, `approvedBy`. Sends a best-effort DM to the pitcher. Idempotent: re-approving an already-approved pitch is a no-op (no duplicate DM).
- `pitchEffectiveStatus` now returns `"pending" | "dismissed" | "approved"`.
- `onPitchedIdeas` returns updated `counts: { pending, approved, dismissed, all }` and supports `?status=approved` filter.
- Mod pitches card: "✅ Approve" (green) + "🗑️ Dismiss" (white) buttons side-by-side.
- 3-state filter on the mod Pitches tab: pending (default) / approved / dismissed, with cross-filter counts.
- My Stuff → Pitches shows "✅ Approved on {date} by u/{mod}" for approved pitches.
- New pure helper `buildApproveDm(pitch)` in `meetit.ts` for the DM template — testable, deterministic.
- All actions log structured lines: `[APPROVE-IDEA]` prefix, includes actor and outcome.

## Capabilities

### New Capabilities
- `pitch-approve`: Mod can approve a pitch; pitcher is notified via DM; pitch status is "approved" and visible in the mod dashboard's "approved" filter and in the pitcher's My Stuff.

### Modified Capabilities
- `pitch-feedback-loop`: Extends the pitch status enum from `{pending, dismissed}` to `{pending, dismissed, approved}`. The My Stuff renderer adds an "approved" branch parallel to the "dismissed" branch. The mod Pitches tab gains a third filter state.

## Impact

- `src/shared/api.ts`: add `ApproveIdea: "/api/approve-idea"` to `ApiEndpoint`. Update `pitched-ideas` response type to include `approved` in `counts`.
- `src/shared/meetit.ts`: extend `pitchEffectiveStatus` to return `"approved"` when `idea.status === "approved"`. New `buildApproveDm(pitch: {title, submittedBy}): {subject, body}` pure helper.
- `src/server/server.ts`:
  - New `onApproveIdea(req)` handler (mod-gated, idempotent, best-effort DM).
  - Update `onPitchedIdeas` to include `approved` in `counts` and to handle the `?status=approved` filter (default + dismissed + approved all exclude each other; `?status=all` returns everything).
  - Add `ApproveIdea` to the switch router.
- `src/client/app.ts`:
  - Add "✅ Approve" + "🗑️ Dismiss" two-button row in the mod pitches card actions (line ~1402).
  - New `approveIdea(id)` function mirroring `dismissIdea` (lock, confirm, fetch, refetch, unlock).
  - Action handler: `case "approve-idea": if (id) approveIdea(id); break;`.
  - Update `renderModPitches` empty-state to show "✅ View approved (N)" link when count > 0.
  - Update `setModPitchesFilter` to accept "approved".
  - Update `renderMyPitchCard` (line ~737) to add an "approved" branch.
- `tools/meetit-behavior.test.ts`: ~10-12 new tests for the pure helpers (DM template, status function, idempotency check).
- `TEST_CASES.md`: add Test 7 (Approve Pitch) with 8-10 steps including 2-device playtest.
- `openspec/changes/pitch-approve/specs/pitch-approve/spec.md`: new spec.

## Note

This is the minimal "approve" — it does NOT include:
- Auto-creation of an event from the pitch data
- "→ Event" conversion flow
- Auto-RSVP of the pitcher to the resulting event
- "Approved by 3 mods" quorum
- Public Ideas surface

Those are deferred to a post-launch change once approve has been used in production for a while.
