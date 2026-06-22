# Design: Discussion-friendly reminder posts

## Problem

The current reminder post in `onCheckEvents()` (`server.ts:781`) uses `userGeneratedContent` to attach a markdown body to a `submitCustomPost` call. This produces a custom-post app iframe on the subreddit feed with the title `📢 Event Reminder: ... is happening 2026-06-21!` and **no visible body content**.

`userGeneratedContent` is documented for `runAs: 'USER'` flows (per [User Actions docs](https://developers.reddit.com/docs/capabilities/server/userActions)). For app-owned posts, the canonical field is `textFallback` (per [Text Fallback docs](https://developers.reddit.com/docs/capabilities/server/text_fallback)). `textFallback` is rendered on:
- new reddit
- old reddit (where interactive posts can't render)
- third-party mobile apps (Relay, BaconReader, etc.)
- Reddit search engine (SEO)
- Reddit Answers / AI summarization
- AutoModerator rule processing
- Safety filters

The current `userGeneratedContent` body is hidden behind the app iframe on most of these surfaces.

## Solution

Switch the reminder to `textFallback` and add three more things to the body:

1. **Emoji section headers** (`📅 🗓️ ⏰ 📍`) so the body scans visually like a card
2. **Organizer `u/username` mention** so attendees can reach out via DM
3. **Mod list `u/mod1 u/mod2 u/mod3`** so discussion threads have moderators available
4. **CTA line** to invite comments / questions / ride coordination

The post still launches the Meetit app iframe inline (default entrypoint `app.html`); the `textFallback` is the markdown body that shows on every other surface.

## API choice: why `textFallback` (not `userGeneratedContent`)

| Concern | `userGeneratedContent` | `textFallback` |
|---------|----------------------|----------------|
| Semantically correct for app-owned post | ❌ ("user wrote this") | ✅ ("fallback for non-interactive") |
| Renders on old.reddit | ⚠️ Behaves like fallback but semantically wrong | ✅ Officially supported |
| Renders on 3rd-party mobile apps | ⚠️ Behaves like fallback | ✅ |
| SEO / Google indexing | ⚠️ Not the canonical field | ✅ |
| Safety filter pass | ⚠️ Designed for user content; stricter checks | ✅ Designed for app content |
| AutoMod rule processing | ⚠️ Skipped (custom-post payload) | ✅ Processed like normal text post |

The `textFallback` field accepts a markdown string up to 40,000 chars. Our body is ~500 chars.

## Body format

```markdown
## 📅 2026-06-21

## ⏰ 18:30

## 📍 Koramangala Social

## 📝 About this event
Bring a laptop and good vibes! We'll be doing lightning talks and demoing side projects.

---

**Organized by:** u/alice

**Moderators:** u/DarelPhilip u/ModTwo

---

💬 Drop a comment if you're going, ask questions, or coordinate rides!
```

The post title is `🔔 Reminder: ${event.title} — ${event.date}` so it scans cleanly in the feed.

## Empty field handling

| Field empty | Behavior |
|-------------|----------|
| `event.location` | Skip the `## 📍` section entirely |
| `event.description` | Skip the `## 📝 About this event` section entirely |
| `event.organizer` | Fall back to `context.username` (the app account) |
| `mod_usernames` setting | Skip the `**Moderators:**` line entirely |
| `event.time` | Show `## ⏰ TBD` (rare; reserve for organizer-draft events) |

The body builder uses `.filter(Boolean)` on a section array so empty sections never produce blank lines.

## Testability

`buildReminderBody()` is a **pure function** in `src/shared/meetit.ts` (no Devvit imports, no `context`, no `redis`). Inputs are plain TypeScript values, output is a plain string. This means:

- Can be unit-tested with `node:test` (no mocks needed)
- Same file as the other shared helpers (`buildAttendees`, `csvEscape`, etc.) — consistency with existing pattern
- No risk of breaking server context in tests

## Bundled fix: `fix-bug2-cron-reminder-retry`

The existing `fix-bug2-cron-reminder-retry` proposal modifies the same CRON block. Bundling avoids two PRs touching the same function in the same 5-day window. The two changes are:

### 1. Retry window

**Before:**
```ts
if (hoursUntilEvent > reminderHours || hoursUntilEvent < 0) continue;
```

**After:**
```ts
if (hoursUntilEvent > reminderHours || hoursUntilEvent < -1) continue;
```

This allows reminders to fire for events that started up to 1 hour ago. Useful when CRON has downtime or runs late.

### 2. Dedup flag after success

**Before:**
```ts
const remindedKey = `meetit:reminded:${eventId}`;
if (await redis.get(remindedKey)) continue;
await redis.set(remindedKey, "true");        // flag set BEFORE post
await redis.expire(remindedKey, 86400);
try {
  await reddit.submitCustomPost({...});     // if this throws, flag is already set
} catch (e) { console.error(`[CRON] Post failed: ${e}`); }
```

**After:**
```ts
const remindedKey = `meetit:reminded:${eventId}`;
if (await redis.get(remindedKey)) continue;
try {
  const post = await reddit.submitCustomPost({...});
  await redis.set(remindedKey, "true");     // flag set AFTER post succeeds
  await redis.expire(remindedKey, 86400);
  serverLog("info", `[CRON] Reminder post sent for ${event.title} (postId=${post.id})`);
} catch (e) { console.error(`[CRON] Post failed: ${e}`); }
```

If `submitCustomPost` throws, `remindedKey` is NOT set, and the next CRON cycle (≤5 min later) will retry.

## Why not a different approach?

| Alternative | Why rejected |
|-------------|-------------|
| `reddit.submitPost()` (plain text post, no app) | Breaks consistency: the post wouldn't launch Meetit. Users couldn't RSVP from inside the post. Defeats the purpose. |
| Sticky-comment on a hidden anchor post | Adds complexity, harder to discover. The textFallback approach achieves the same goal with one call. |
| `runAs: 'USER'` reminder posts | Would require app review (per [User Actions docs](https://developers.reddit.com/docs/capabilities/server/userActions)) — out of scope. |
| New entrypoint for a comment-focused reminder UI | Overengineering — `textFallback` already makes the body readable everywhere, and the app iframe still launches for RSVP. |
| Per-RSVP DM reminders | `sendPrivateMessage({to: username})` is [documented broken in LEARNINGS.md](LEARNINGS.md) — only modmail (`to: "/r/subreddit"`) works from CRON. |

## Risks

1. **Posts-as-APP-account visibility** — `submitCustomPost` posts as the app account. This is the current behavior; no change. Mods will see "Posted by u/Meetit..." in the feed.
2. **`textFallback` 40K char ceiling** — Easily sufficient (~500 chars max for our body).
3. **Markdown render fidelity** — Headers, lists, `**bold**`, `u/username` (auto-link), and emojis all work in `textFallback`. Bullet lists via `-` or `*` work.
4. **Existing reminder posts (already created with `userGeneratedContent`)** — won't auto-upgrade (posts are immutable). They keep their current appearance. New reminders use the new format.
5. **Mods visibility to attendees** — listing mods in the post body is a small privacy trade-off. Mitigated: only mods already configured in `mod_usernames` setting (admin-set, not user-controllable). If admins want to opt out, they can simply leave `mod_usernames` empty.

## Migration / rollout

- Deploy via `npm run deploy` (existing CRON fires within 5 min on production)
- New reminders going forward use the new format
- Old reminders (created before deploy) keep their old format — no action needed

---

## Post-launch hotfix (2026-06-19)

Two bugs were discovered when the first reminder posts went live in `r/meetup_hub2_dev`. Both fixed in < 30 lines of code (no new OpenSpec change — surgical hotfix to the same capability).

### Bug 1: `u/u/darelphilip` — duplicate `u/` prefix in organizer line

**Symptom:** The reminder body rendered as:

```
**Organized by:** u/u/darelphilip
```

**Root cause:** The submit-event form prefill at `app.ts:2310` prepends `u/` to the organizer's username:

```ts
(document.getElementById("event-organizer") as HTMLInputElement).value = "u/" + currentUsername;
```

The form input is a free-text field — users can also type `u/theirname` manually. So `event.organizer` is **stored with the `u/` prefix** in Redis. The original `buildReminderBody` then blindly re-prefixed with `u/${event.organizer}`, producing `u/u/darelphilip`.

**Fix:** Added a private `stripUsernamePrefix(raw)` helper in `src/shared/meetit.ts` that strips any leading `u/` (case-insensitive) from a username. `buildReminderBody` now normalizes both the organizer and the mod list before re-prefixing. This is defensive — the function now accepts usernames with OR without `u/` and always renders exactly one `u/`.

```ts
// In buildReminderBody:
const cleanOrganizer = stripUsernamePrefix(organizer);
const cleanMods = mods.map((m) => stripUsernamePrefix(m)).filter((m) => m.length > 0);
```

The mod list happened to render correctly because `mod_usernames` is stored without the `u/` prefix (it's a plain username list, not user-typed text).

### Bug 2: Title format missing `@ location`

**Symptom:** The reminder title was:

```
🔔 Reminder: You 😗 me the — 2026-06-20
```

**User request:** Change to `Event Reminder - event name - date @ location` for more scannable context.

**Fix:** Added a new pure helper `buildReminderTitle(event)` in `src/shared/meetit.ts` that returns the new format. The `@ location` suffix is omitted when location is empty/whitespace. The date and title fall back to `TBD` (mirrors body builder behavior).

```ts
// New helper:
export function buildReminderTitle(event: Pick<MeetitEvent, "title" | "date" | "location">): string {
  const title = event.title || "TBD";
  const date = event.date || "TBD";
  const location = event.location && event.location.trim();
  return location
    ? `🔔 Event Reminder: ${title} — ${date} @ ${location}`
    : `🔔 Event Reminder: ${title} — ${date}`;
}
```

`server.ts` now calls `buildReminderTitle(event)` instead of building the title inline.

### Why this was a hotfix, not a new OpenSpec change

- Both bugs are correctness/UX defects in the same capability (`reminder-system`)
- Total change footprint: ~20 lines of code + 9 new unit tests
- No new capability, no new endpoint, no new dependency, no new spec section needed
- Per `LEARNINGS.md` guidance: "surgical changes only — no refactoring beyond change scope"

### Tests added (in `tools/meetit-behavior.test.ts`)

- `buildReminderBody strips a leading u/ from organizer before re-prefixing` (catches bug 1)
- `buildReminderBody is case-insensitive when stripping u/ prefix` (defensive)
- `buildReminderBody strips u/ prefix from each mod entry` (defensive)
- `buildReminderBody filters out empty mod entries after stripping` (edge case)
- `buildReminderBody omits Organized by line when organizer is empty` (defensive)
- `buildReminderTitle includes title, date, and @ location when all present` (catches bug 2)
- `buildReminderTitle omits the @ location suffix when location is empty` (defensive)
- `buildReminderTitle omits the @ location suffix when location is whitespace` (defensive)
- `buildReminderTitle falls back to TBD for missing title and date` (defensive)

Total: 9 new tests, 28/28 pass.

### Verification

- `npm test`: 28/28 pass
- `npm run type-check`: 0 new errors (11 pre-existing in `app.ts` unrelated)
- `npm run build`: success
- `dist/server/index.js` contains `stripUsernamePrefix`, `buildReminderTitle`, and the new title format
- Direct invocation renders the expected output:
  - Title: `🔔 Event Reminder: You 😗 me the — 2026-06-20 @ You can 🥫 me with your`
  - Body: `**Organized by:** u/darelphilip` (no `u/u/`)
- No DB migration, no Redis migration, no client migration
