# Tasks for e25-rsvp-disclaimer

## 1. OpenSpec: add new capability spec
- [ ] 1.1 Create `openspec/specs/rsvp-disclosure/spec.md` with Purpose + 2 ADDED Requirements (disclosure text visible, text is informational not blocking)
- [ ] 1.2 Run `openspec validate e25-rsvp-disclaimer --strict` and confirm it passes
- [ ] 1.3 Run `openspec validate --all --strict` to confirm no regressions

## 2. UI: add disclaimer to RSVP form
- [ ] 2.1 In `public/app.html`, locate the `#rsvp-overlay` block (around line 507-514)
- [ ] 2.2 Add a `<div>` with the disclaimer text immediately above the `Confirm RSVP →` button
- [ ] 2.3 Match the existing event-submit disclaimer style: `font-size:11px;color:var(--muted);margin-top:10px;line-height:1.4`
- [ ] 2.4 Text content:
  > 🔒 **Your RSVP details (username, email, phone) are visible to the event organizer and subreddit moderators.** Redditors who view the event see only your username. You can leave the event anytime from My Stuff.

## 3. Verification
- [ ] 3.1 Run `npm run build` and confirm `public/app.html` is built
- [ ] 3.2 Visually inspect the built `public/app.html` to confirm the disclaimer is present in the RSVP overlay
- [ ] 3.3 Confirm no JS, CSS, or server-side changes were made (git diff should only show `app.html`)
- [ ] 3.4 Confirm no new dependencies were added
- [ ] 3.5 Confirm `devvit.json` is unchanged
- [ ] 3.6 Confirm `src/server/server.ts`, `src/client/app.ts`, `src/shared/*` are unchanged (no logic touched)

## 4. Archive
- [ ] 4.1 Run `openspec archive e25-rsvp-disclaimer --yes` to merge the spec into `openspec/specs/rsvp-disclosure/spec.md`
- [ ] 4.2 Confirm the change folder is moved to `openspec/changes/archive/2026-06-19-e25-rsvp-disclaimer/`

## 5. (Optional, follow-up) Stale spec cleanup
- [ ] 5.1 Open a separate OpenSpec change to update `webhook-consent/spec.md` with a clear "DEPRECATED — feature removed" banner, OR delete the spec entirely
