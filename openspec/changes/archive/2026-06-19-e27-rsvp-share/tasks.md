# Tasks for e27-rsvp-share

## 1. OpenSpec: add capability spec
- [ ] 1.1 Create `openspec/specs/rsvp-share/spec.md` with Purpose + 4 ADDED Requirements (button visible, preview overlay, post-as-user with fallback, 24h dedup)
- [ ] 1.2 Run `openspec validate e27-rsvp-share --strict` and confirm pass
- [ ] 1.3 Run `openspec validate --all --strict` to confirm no regressions

## 2. Config: add asUser permission
- [ ] 2.1 Edit `devvit.json`: add `"asUser": ["SUBMIT_POST"]` under `permissions.reddit`
- [ ] 2.2 Validate JSON syntax via `node -e "JSON.parse(require('fs').readFileSync('devvit.json', 'utf8'))"`

## 3. Shared types: add endpoint
- [ ] 3.1 Add `RsvpShare: "/api/rsvp-share"` to `ApiEndpoint` enum in `src/shared/api.ts`

## 4. Shared helper: buildRsvpShareBody()
- [ ] 4.1 Add `buildRsvpShareBody()` pure function in `src/shared/meetit.ts`
  - Input: `event: Pick<MeetitEvent, "title" | "date" | "time" | "location" | "description" | "mapUrl">`, `username: string`, `subredditName?: string`
  - Output: `{ title: string, body: string }` (two values for the two post fields)
  - Truncates description to 300 chars with "…" if longer
  - Strips `u/` prefix from username (defensive, mirrors e24 hotfix)
  - Escapes markdown special chars in user-typed fields
  - Skips empty sections

## 5. Tests
- [ ] 5.1 Add 5 test cases to `tools/meetit-behavior.test.ts`:
  - Full event with mapUrl + description + location + time → body contains all sections
  - Event without mapUrl → body omits maps line
  - Event without description → body omits description section
  - Truncates long descriptions (>300 chars) with "…"
  - Strips `u/` prefix from username before rendering
- [ ] 5.2 Run `npm test` — 35 + 5 = 40 pass

## 6. Server: new endpoint
- [ ] 6.1 Add `onRsvpShare(req)` handler in `src/server/server.ts`
  - Read `{ eventId }` from body
  - 404 if event not found (lookup via `getActiveEvent(eventId)`)
  - 401 if no `context.username`
  - Check `redis.get("meetit:rsvp_share:" + eventId + ":" + username)` → if set, return `{ success: false, reason: "already_shared" }`
  - Build post title + body via `buildRsvpShareBody()`
  - Try `reddit.submitPost({ ..., runAs: 'USER', userGeneratedContent: { text: title + "\n\n" + body } })`
  - On error, fall back to `reddit.submitPost({ ..., runAs: 'APP', text: body })` (no `userGeneratedContent` for APP)
  - Set dedup key with 24h TTL regardless of `postedAs`
  - Return `{ type: "rsvp-share", success: true, postUrl: post.url, postedAs: "USER" | "APP" }`
  - Log every step
- [ ] 6.2 Add `ApiEndpoint.RsvpShare` case to the switch in `onRequest`
- [ ] 6.3 Add response type to `ApiResponse` union

## 7. UI: share-preview overlay markup
- [ ] 7.1 Add new overlay to `public/app.html` (similar to existing `confirm-overlay`):
  - `<div class="overlay" id="rsvp-share-overlay">` with header, body (preview area), footer (Post + Cancel buttons)

## 8. Client: wire up the share button
- [ ] 8.1 In `src/client/app.ts`, modify the RSVP success card (line ~2058) to add a 3rd button:
  - `<button class="btn btn-pink btn-compact" data-action="share-rsvp" data-id="${eventId}">🎉 Share that I'm going</button>`
- [ ] 8.2 Add `case "share-rsvp":` to the global click handler
  - Build the preview HTML (title + body, rendered as preformatted text in a code-style block)
  - Open the rsvp-share-overlay
  - On Cancel: close overlay
  - On Post: `fetch("/api/rsvp-share", { method: "POST", body: JSON.stringify({ eventId }) })`
  - On success: close overlay, show toast "Posted! 🎉", `navigateTo(postUrl)` to open the new post
  - On `already_shared`: show toast "You already shared this event today"
  - On other error: show toast "Share failed - retry"

## 9. Verification
- [ ] 9.1 `npm test` — 40/40 pass
- [ ] 9.2 `npm run type-check` — 0 new errors
- [ ] 9.3 `npm run build` — succeeds
- [ ] 9.4 Confirm `dist/server/index.js` contains `rsvp-share`, `buildRsvpShareBody`, and the dedup key
- [ ] 9.5 Direct invocation: render a post title + body for a real event and verify the format

## 10. Archive
- [ ] 10.1 Run `openspec archive e27-rsvp-share --yes`
- [ ] 10.2 Confirm change folder moves to `openspec/changes/archive/2026-06-19-e27-rsvp-share/`
- [ ] 10.3 Verify `openspec/specs/rsvp-share/spec.md` exists

## 11. LEARNINGS.md
- [ ] 11.1 Add new `## 51. RSVP Share: User Actions Permission + Draft Preview UX (2026-06-19)` section
