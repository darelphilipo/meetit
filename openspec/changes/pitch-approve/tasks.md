## 1. Shared: extend status enum + DM template helper

- [ ] 1.1 In `src/shared/meetit.ts`, update `pitchEffectiveStatus(idea)` to return `"pending" | "dismissed" | "approved"`. New logic: `return idea?.status === "approved" ? "approved" : idea?.status === "dismissed" ? "dismissed" : "pending";`
- [ ] 1.2 Add `buildApproveDm(pitch: { title: string; submittedBy: string }): { subject: string; body: string }` as a pure helper. Strips any `u/` prefix from `submittedBy`. Returns:
  - subject: `"✅ Your Meetit pitch was approved!"`
  - body: 4-paragraph template with the username and pitch title interpolated.
- [ ] 1.3 The function is deterministic — same input always produces the same output (no timestamps in the body, no random IDs) — so it's testable with simple equality assertions.

## 2. Server: onApproveIdea handler

- [ ] 2.1 In `src/server/server.ts`, add a new `async function onApproveIdea(req: IncomingMessage): Promise<ApiResponse>` after `onDismissIdea` (line ~750).
- [ ] 2.2 Handler flow:
  1. `await requireMod()` — return 403 if not a mod.
  2. `readJSON<{ ideaId: string }>(req)` — return 400 if `ideaId` missing.
  3. `redis.hGet("meetit:pitched_ideas", ideaId)` — return 404 if not found.
  4. `safeJSONParse(ideaJson)` — return 404 if malformed.
  5. **Idempotency check**: if `idea.status === "approved"`, log `[APPROVE-IDEA] ignored: pitch ${id} already has status="approved"` and return success without re-writing or re-sending DM. Prevents double-DM.
  6. `hSet` with `{status: "approved", approvedAt: new Date().toISOString(), approvedBy: context.username, ...idea}`.
  7. Best-effort DM via `reddit.sendPrivateMessage({to: idea.submittedBy, subject, text: body})` wrapped in try/catch. On success, log `[APPROVE-IDEA] Idea {id} approved by u/{mod}, DM sent to u/{user}`. On failure, log `[APPROVE-IDEA] DM failed for u/{user}: {error} (status still set to approved)`. Either way, return success.
- [ ] 2.3 In the switch router (line ~136), add a case for `ApiEndpoint.ApproveIdea` → `onApproveIdea(req)`.

## 3. Server: onPitchedIdeas update

- [ ] 3.1 In `onPitchedIdeas` (line 667), update the `counts` shape to `{ pending: number, approved: number, dismissed: number, all: number }`.
- [ ] 3.2 Update the counts loop to count all three statuses (current code only counts `dismissed` vs `pending`).
- [ ] 3.3 Update the filter logic: when filter is `"approved"`, return ideas with `pitchEffectiveStatus(idea) === "approved"`. When `"pending"`, return everything that's not `dismissed` AND not `approved` (so approved pitches don't clutter the pending view).
- [ ] 3.4 Update the log line: `[PITCHES] status={filter} n={n} (counts pending={p} approved={a} dismissed={d})`.

## 4. API endpoint: add to ApiEndpoint

- [ ] 4.1 In `src/shared/api.ts:68-89`, add `ApproveIdea: "/api/approve-idea"` to the `ApiEndpoint` const object.

## 5. Client: approveIdea function

- [ ] 5.1 In `src/client/app.ts`, add a new `async function approveIdea(id: string)` after `dismissIdea` (line ~1816). Mirrors dismissIdea:
  - Lock guard: `var k = "approve-" + id; if (isLocked(k)) return; lock(k);`
  - Title lookup: `getItemTitle(id, modItems)`.
  - Confirm overlay (reuses `confirmDestructive`): `if (!await confirmDestructive('Approve "' + title + '"? The pitcher will be notified via DM.')) { unlock(k); return; }`
  - `setBtnLoading` on the approve button.
  - `POST /api/approve-idea` with `{ ideaId: id }`.
  - On success: `showToast("Pitch approved — DM sent to " + submitter, "success")` — but we don't know the submitter client-side at this point, so just show "Pitch approved".
  - Refetch: `delete modTabCache["pitches"]; loadModTab("pitches");`
  - Client log: `log("approveIdea approved " + id + ", awaiting refetch")`
  - Unlock in `finally`.
- [ ] 5.2 Add action handler: `case "approve-idea": if (id) approveIdea(id); break;` (near the dismiss-idea case at line 2720).

## 6. Client: mod pitches card two-button row

- [ ] 6.1 In `renderModCard` (line ~1402), the `else` branch (pitches tab) currently has a single "🗑️ Dismiss" button. Replace with a two-button row:
  ```html
  <div style="display:flex;gap:8px;">
    <button class="btn btn-green btn-action" data-id="..." data-action="approve-idea" style="flex:1;">✅ Approve</button>
    <button class="btn btn-white btn-action" data-id="..." data-action="dismiss-idea" style="flex:1;">🗑️ Dismiss</button>
  </div>
  ```

## 7. Client: 3-state filter on Pitches tab

- [ ] 7.1 In `renderModPitches` (line 1469), update the empty-state branch (line 1474-1495) to add a "✅ View approved (N)" link parallel to the existing "🗑️ View dismissed (N)" link. The link is shown when `modPitchesFilter === "pending" && modPitchesCounts.approved > 0`.
- [ ] 7.2 In the non-empty branch (line 1511-1525), also add the "✅ View approved (N)" link parallel to the dismissed link.
- [ ] 7.3 In `setModPitchesFilter` (line 1532), update the type to `"pending" | "approved" | "dismissed"`. No other change needed (the function just sets the var and refetches).

## 8. Client: My Stuff → Pitches approved status

- [ ] 8.1 In `renderMyPitchCard` (line ~737), add an "approved" branch parallel to the existing "dismissed" branch:
  ```ts
  if (p.status === "approved") {
    var aBy = p.approvedBy ? ' by u/' + escapeHtml(p.approvedBy) : '';
    var aAt = p.approvedAt ? ' on ' + escapeHtml(new Date(p.approvedAt).toLocaleDateString()) : '';
    statusLine = '<div style="font-size:12px;color:#15803d;font-weight:600;margin-bottom:4px;">✅ Approved' + aAt + aBy + ' — submit as event from the [+] menu</div>';
  } else if (p.status === "dismissed") {
    // existing dismissed branch
  } else {
    // existing pending branch
  }
  ```

## 9. Tests

- [ ] 9.1 In `tools/meetit-behavior.test.ts`, add ~10-12 tests:
  - `pitchEffectiveStatus` returns "approved" for `status === "approved"`
  - `pitchEffectiveStatus` returns "pending" for `status === "pending"`, `undefined`, `null`, `""`
  - `pitchEffectiveStatus` returns "dismissed" for `status === "dismissed"`
  - `pitchEffectiveStatus` is **case-sensitive** (rejects "Approved", "APPROVED") — defensive against schema drift
  - `buildApproveDm` produces expected subject + body for a pitch with `u/` prefix
  - `buildApproveDm` produces expected subject + body for a pitch without `u/` prefix
  - `buildApproveDm` is deterministic (same input → same output, run twice)
  - `buildApproveDm` escapes the title (titles with `**` or `[` should not break markdown)
- [ ] 9.2 Manual playtest in `TEST_CASES.md` Test 7 (8-10 steps), including the 2-device scenario.

## 10. Verification

- [ ] 10.1 `npm test` — 85/85 still pass + 10-12 new = ~95-97 total.
- [ ] 10.2 `npx openspec validate --all` — passes (45 → 46).
- [ ] 10.3 Manual playtest (2 devices):
  - Device 1 (submitter): submit a pitch with title "Board game night"
  - Device 2 (mod): see the pitch in the pending queue
  - Device 2: click "✅ Approve" → confirm overlay → "Yes, Do It"
  - Device 2: verify the pitch is gone from the pending view, and a "✅ View approved (1)" link appears below
  - Device 2: click "✅ View approved (1)" → see the pitch with status "approved"
  - Device 1: refresh → My Stuff → Pitches → see the pitch with "✅ Approved on {date} by u/{mod} — submit as event from the [+] menu" line
  - Device 1: check Reddit DMs → see the approval DM
- [ ] 10.4 Add Test 7 to `TEST_CASES.md` results table.
