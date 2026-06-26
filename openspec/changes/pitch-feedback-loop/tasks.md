## 1. Server: soft-dismiss on mod path

- [ ] 1.1 In `onDismissIdea` (`server.ts:665`), read `reason` from the request body alongside `ideaId`.
- [ ] 1.2 Determine the actor: if the user is the pitch's `submittedBy` and not a mod, take the OWNER branch — keep the existing `hDel("meetit:pitched_ideas", [ideaId])` and return success.
- [ ] 1.3 Otherwise (mod, including a mod who is also the owner), take the MOD branch — require `reason` (non-empty, ≤ 100 chars), else return `{ error: "Reason required", status: 400 }` or `{ error: "Reason must be 100 characters or less", status: 400 }`.
- [ ] 1.4 On the mod branch, write the pitch back to `meetit:pitched_ideas` with `status: "dismissed"`, `dismissReason`, `dismissedAt: new Date().toISOString()`, `dismissedBy: context.username`. Log `[DISMISS] Idea {id} soft-dismissed by u/{mod}: {reason}`.

## 2. Server: DM confirmation on pitch submit

- [ ] 2.1 In `onPitchIdea` (`server.ts:539`), after the `hSet` and before the return, attempt `reddit.sendPrivateMessage({ to: username, subject: "💡 Your idea was received", text: <confirmation body> })`.
- [ ] 2.2 Wrap the DM in try/catch — log the failure (`[PITCH] DM confirmation failed for u/{user}: {err}`) but do NOT fail the submission. The pitch is already saved; the DM is a courtesy.
- [ ] 2.3 Add a `serverLog("info", ...)` line on success and `serverLog("warn", ...)` on failure so the in-app debug panel reflects the outcome.

## 3. Server: status filter on `/api/pitched-ideas`

- [ ] 3.1 In `onPitchedIdeas` (`server.ts:637`), parse `?status=` from the query string. Default to `"pending"` if absent or unrecognized.
- [ ] 3.2 After parsing, filter the returned ideas: include only those whose `status` matches the filter (or is missing — legacy pitches are treated as `"pending"`). If `?status=all`, return everything.
- [ ] 3.3 Update the `[PITCHES] {n} pitched ideas` log to include the filter (`[PITCHES] status={filter} n={n}`).

## 4. Client: reason input for mod dismiss

- [ ] 4.1 Add a `promptForReason(ideaTitle): Promise<string|null>` helper that opens the existing `#confirm-overlay` with a text input (100 char cap, character counter) and a "Dismiss" / "Cancel" button pair. Returns the typed reason, or `null` on cancel.
- [ ] 4.2 In `dismissIdea` (`app.ts:1648`), call `promptForReason(title)` before `confirmDestructive`. If `null`, unlock and return. If non-null, send `{ ideaId, reason }` in the body.
- [ ] 4.3 Update the success toast to "Idea dismissed with reason" (the existing "Idea dismissed" is fine — keep it simple).
- [ ] 4.4 Keep the optimistic remove from `modItems["pitches"]` — dismissed pitches vanish from the mod's default "pending" view immediately.

## 5. Client: warmer toast on pitch submit

- [ ] 5.1 In `submitPitch` (`app.ts:2223`), replace `showToast("Idea sent! ✅", "success")` with `showToast("Idea received! 🎉 Mods will review it — check My Stuff for status.", "success")`.

## 6. Client: status badge in My Stuff → Pitches

- [ ] 6.1 In `renderMyPitchCard` (`app.ts:693-730`), read `p.status` (default `"pending"` when undefined).
- [ ] 6.2 If `status === "dismissed"`, render a status line: `❌ Dismissed: {p.dismissReason} · on {localeDate(p.dismissedAt)} · by u/{p.dismissedBy}`.
- [ ] 6.3 If `status === "pending"` (or undefined), keep the existing `📅 Pitched: {localeDate(p.submittedAt)}` line.
- [ ] 6.4 Add a tiny `(pending review)` suffix to the pending line for clarity: `📅 Pitched: {date} · pending review`.

## 7. Client: mod Pitches tab defaults to pending

- [ ] 7.1 In the `loadModTab` case for `"pitches"` (`app.ts:1215-1218`), append `?status=pending` to the request URL.
- [ ] 7.2 In `renderModPitches` (`app.ts:1435-1450`), after rendering the card, if the active filter is `pending` and a separate count of dismissed pitches is known (return this in the response, e.g. `{ ideas, counts: { pending, dismissed } }`), render a "🗑️ View dismissed (N)" link below the card. Tapping it re-fetches with `?status=dismissed` (or `?status=all`).
- [ ] 7.3 For the `?status=dismissed` view, render a "← Back to pending" link at the top to restore the default.

## 8. Server: response shape for `/api/pitched-ideas`

- [ ] 8.1 Update the response in `onPitchedIdeas` to include `counts: { pending: number, dismissed: number, all: number }` alongside `ideas: [...]`. The client uses `counts` for the "View dismissed (N)" link.

## 9. Test

- [ ] 9.1 Manual: submit a pitch → check inbox for DM (skip if PMs disabled).
- [ ] 9.2 Manual: submit a pitch → see "Idea received! 🎉" toast with My Stuff guidance.
- [ ] 9.3 Manual: as mod, dismiss a pitch with reason "Spam — duplicate" → verify pitch removed from mod's pending view.
- [ ] 9.4 Manual: as mod, try to dismiss with empty reason → see 400 / "Reason required".
- [ ] 9.5 Manual: as pitcher, open My Stuff → Pitches → see "❌ Dismissed: Spam — duplicate · on {date} · by u/{mod}".
- [ ] 9.6 Manual: as pitcher, click Delete on own pending pitch → row hard-deletes (no reason prompt, no status badge shown).
- [ ] 9.7 Manual: as mod, click "View dismissed (N)" → see all dismissed pitches; click "← Back to pending" → return to default.

## 10. Verification

- [ ] 10.1 `npm test` — all existing 65 tests still pass.
- [ ] 10.2 Add unit test: `onDismissIdea` with reason=empty returns 400.
- [ ] 10.3 Add unit test: `onDismissIdea` as owner does `hDel` (status not written).
- [ ] 10.4 Add unit test: `onDismissIdea` as mod writes status + metadata.
- [ ] 10.5 Add unit test: `onPitchedIdeas` with `?status=pending` returns only pending.
- [ ] 10.6 `openspec validate --all` passes.
