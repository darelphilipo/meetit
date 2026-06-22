# Tasks for e26-reminder-map-and-deeplink

## 1. OpenSpec: add capability spec changes
- [ ] 1.1 Add new ADDED Requirement to `specs/reminder-system/spec.md`: "Reminder body includes a Google Maps link when event.mapUrl is set"
- [ ] 1.2 Add new ADDED Requirement: "Reminder deep link points to the stored Meetit app post"
- [ ] 1.3 Run `openspec validate e26-reminder-map-and-deeplink --strict`
- [ ] 1.4 Run `openspec validate --all --strict` to confirm no regressions

## 2. Shared helper: buildReminderBody updates
- [ ] 2.1 Extend `buildReminderBody()` to render a `## 🗺️ [Open in Google Maps](url)` section when `event.mapUrl` is non-empty
- [ ] 2.2 Add new optional 5th parameter `meetitAppPostUrl?: string` to `buildReminderBody()`
- [ ] 2.3 When `meetitAppPostUrl` is set, use it for the "Open in Meetit to RSVP" deep link
- [ ] 2.4 When `meetitAppPostUrl` is unset, fall back to subreddit homepage with a hint for mods ("create a Meetit post first")
- [ ] 2.5 Strip any leading `u/` from URLs is not needed (URLs are well-formed; we trust the form input)

## 3. Server: track Meetit launcher post ID
- [ ] 3.1 In `onMenuCreatePost()`, after `reddit.submitCustomPost` succeeds, write `post.id` to Redis under `meetit:meetit_app_post_id` (overwrite on each invocation)
- [ ] 3.2 Wrap the redis.set in try/catch — failure to persist the post ID should NOT block the post creation UX
- [ ] 3.3 In `onCheckEvents()`, before the per-event loop, read `meetit:meetit_app_post_id` from Redis
- [ ] 3.4 Build `meetitAppPostUrl` = `https://www.reddit.com/comments/${id}/` if ID present, else `undefined`
- [ ] 3.5 Pass `meetitAppPostUrl` to `buildReminderBody()`

## 4. Tests
- [ ] 4.1 Add test: `buildReminderBody` includes a maps section when event.mapUrl is set
- [ ] 4.2 Add test: `buildReminderBody` omits the maps section when event.mapUrl is missing or empty
- [ ] 4.3 Add test: `buildReminderBody` uses meetitAppPostUrl for the "Open in Meetit" link when provided
- [ ] 4.4 Add test: `buildReminderBody` falls back to subreddit homepage with mod hint when meetitAppPostUrl is missing

## 5. Verification
- [ ] 5.1 Run `npm test` — all 28 + 4 new = 32 pass
- [ ] 5.2 Run `npm run type-check` — 0 new errors
- [ ] 5.3 Run `npm run build` — succeeds
- [ ] 5.4 Confirm `dist/server/index.js` contains the maps link + new Redis key
- [ ] 5.5 Direct invocation test: render body for an event with mapUrl + meetitAppPostUrl and verify all sections present

## 6. Archive
- [ ] 6.1 Run `openspec archive e26-reminder-map-and-deeplink --yes`
- [ ] 6.2 Confirm change is moved to `openspec/changes/archive/2026-06-19-e26-reminder-map-and-deeplink/`
- [ ] 6.3 Verify `openspec/specs/reminder-system/spec.md` now has the new requirements

## 7. LEARNINGS.md
- [ ] 7.1 Add new `## 50. Reminder Post Maps Link + Deep Link to Launcher Post (2026-06-19)` section
