## Why

Pitches today are a black hole. The user submits an idea, sees a generic "Idea sent! ✅" toast, and has no further signal. The mod sees the pitch in the mod dashboard and can hard-delete it; the next time the pitcher's My Stuff refreshes, the row is gone with no explanation. The pitcher is left wondering whether anyone saw it, whether it was rejected, or whether the system just dropped it.

The minimal fix is a feedback loop: give the pitcher a visible acknowledgment on submit, and surface mod actions (with a reason) on the pitch in My Stuff instead of silently removing the row.

## Priority: 1/5

## Status: proposed

## What Changes

- On pitch submit, send a private message to the user confirming receipt, and show a warmer toast with status-tracking guidance.
- On mod dismiss, write the pitch back to `meetit:pitched_ideas` with `status="dismissed"`, `dismissReason`, `dismissedAt`, `dismissedBy` instead of `hDel`-ing. The reason is a required text input (max 100 chars) in the mod dashboard.
- In My Stuff → Pitches, render the new status: "📋 Pending review" (default / legacy) or "❌ Dismissed: {reason} · by u/{dismissedBy}".
- The owner's self-delete (`deletePitch`) continues to hard-delete (existing behavior, no reason required, no change to the user experience).
- The mod dashboard Pitches tab defaults to `?status=pending` so dismissed/converted pitches don't clutter the active queue. A "View dismissed" link with count is shown if any exist.

## Capabilities

### New Capabilities
- `pitch-feedback-loop`: Pitcher receives visible feedback on submit and on mod actions; mod's dismiss writes a reason that the pitcher sees in My Stuff.

### Modified Capabilities
- None.

## Impact

- `src/server/server.ts`:
  - `onPitchIdea` (lines 539-560): add `reddit.sendPrivateMessage` after the Redis write (logged on failure, does not block submit).
  - `onDismissIdea` (lines 665-678): branch by auth — owner path keeps `hDel`; mod path requires `reason` in the body, writes back with `status="dismissed"` + metadata.
  - `onPitchedIdeas` (lines 637-643): accept `?status=` query param, default to `"pending"`. Return all statuses if `?status=all` or `?status=dismissed`.
  - `onMySubmissions` (lines 779-783): no schema change — the new fields flow through automatically because pitches are read as-is from Redis.
- `src/client/app.ts`:
  - `submitPitch` (line 2222-2223): replace toast with a warmer message that points at My Stuff.
  - `dismissIdea` (line 1648): add a small reason input prompt before the destructive confirm; pass `reason` in the request body.
  - `renderMyPitchCard` (lines 693-730): render the status badge line.
  - `loadModTab` for `"pitches"` (line 1215-1218): append `?status=pending` to the request; show a "View dismissed (N)" link that re-fetches with `?status=dismissed` (or `?status=all`).
- `public/app.html`: no structural change. The reason input reuses the existing `#confirm-overlay` pattern with an extra text input.
- `openspec/changes/pitch-feedback-loop/specs/pitch-feedback-loop/spec.md`: new spec.
- `TEST_CASES.md`: extend Test 1 and add Test 4 (Pitch Feedback Loop).

## Note

This is the minimal pre-launch version of the broader pitch-lifecycle work. It does NOT include: category on the pitch form, "→ Event" conversion flow, public Ideas surface, voting, time-decayed sort, or 30-day delete. Those are deferred to a post-launch change once there's a real track record of pitch volume.
