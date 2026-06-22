# Tasks for e24-discussion-friendly-reminders

## 1. OpenSpec: add capability spec
- [ ] 1.1 Create `openspec/specs/reminder-system/spec.md` with Purpose + 4 ADDED Requirements (one for textFallback body, one for organizer mention, one for mod list, one for retry window)
- [ ] 1.2 Run `openspec validate e24-discussion-friendly-reminders --strict` and confirm it passes
- [ ] 1.3 Run `openspec validate --strict` (no change name) to confirm no regressions

## 2. Shared helper: buildReminderBody()
- [ ] 2.1 Add `buildReminderBody()` pure function in `src/shared/meetit.ts`
  - Input: `event: MeetitEvent`, `organizer: string`, `mods: string[]`
  - Output: markdown string with emoji section headers, organizer `u/` mention, mod list `u/` mentions, CTA
  - Skip empty sections (no location, no description, no mods)
- [ ] 2.2 Export it from `src/shared/meetit.ts`

## 3. Server: switch to textFallback + bundle fix-bug2
- [ ] 3.1 Import `buildReminderBody` in `src/server/server.ts` (extend the existing `import { ... } from "../shared/meetit.ts"` line)
- [ ] 3.2 Inside `onCheckEvents`, fetch `mod_usernames` setting once and parse to `string[]`
- [ ] 3.3 Inside the per-event loop, resolve `organizerUsername = event.organizer || context.username` (with try/catch so context.username undefined doesn't crash)
- [ ] 3.4 Replace `userGeneratedContent` with `textFallback` in the `submitCustomPost` call
- [ ] 3.5 Update the title to: `🔔 Reminder: ${event.title} — ${event.date}`
- [ ] 3.6 Extend the window condition: replace `hoursUntilEvent < 0` with `hoursUntilEvent < -1` (1h post-start grace)
- [ ] 3.7 Move `redis.set(remindedKey, "true")` + `redis.expire(remindedKey, 86400)` to AFTER the `await reddit.submitCustomPost(...)` call (inside the try block, before the catch ends)
- [ ] 3.8 Add `serverLog("info", ...)` on successful post (with event.title and post.id)
- [ ] 3.9 Keep the existing `console.error` on failure path

## 4. Tests
- [ ] 4.1 Add 4 new test cases to `tools/meetit-behavior.test.ts`:
  - **Full event**: all fields populated → body contains date/time/location/description/organizer/mods/CTA
  - **Missing description**: empty `description` → body does NOT include "About this event" section
  - **No organizer**: empty `event.organizer` → body uses fallback `u/${context.username}` from parameter
  - **No mods**: empty `mods` array → body does NOT include "Moderators:" line
- [ ] 4.2 Run `npm test` and confirm all tests pass (existing 7 + new 4 = 11)

## 5. Verification
- [ ] 5.1 Run `npm run type-check` (tsc --build) and confirm clean
- [ ] 5.2 Run `npm run build` and confirm `public/app.html` and `dist/server/index.js` are produced
- [ ] 5.3 Visually inspect the built `dist/server/index.js` to confirm `buildReminderBody` is bundled and `textFallback` is present in the submit call
- [ ] 5.4 Confirm no new dependencies were added to `package.json`
- [ ] 5.5 Confirm `devvit.json` is unchanged

## 6. Archive
- [ ] 6.1 Run `openspec archive e24-discussion-friendly-reminders --yes` to merge the spec into `openspec/specs/reminder-system/spec.md`
- [ ] 6.2 Confirm the change folder is moved to `openspec/changes/archive/2026-06-19-e24-discussion-friendly-reminders/`
