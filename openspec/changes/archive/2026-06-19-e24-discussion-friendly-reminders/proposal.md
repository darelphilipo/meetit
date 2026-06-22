## Why

Today, when the `*/5 * * * *` CRON detects an upcoming event, it posts a reminder using `reddit.submitCustomPost()` with a title like `📢 Event Reminder: ... is happening 2026-06-21!` and a `userGeneratedContent` blob. The result is a **custom-post app iframe** on the subreddit feed with **no visible body** — `userGeneratedContent` is designed for `runAs: 'USER'` flows, not app-owned posts. Redditors see a title and an empty space below it.

Initial design tried `textFallback` (a `submitCustomPost` field) as a halfway fix, but the post still rendered the Meetit app iframe on new.reddit and the official mobile app — `textFallback` is only used as a fallback on old.reddit, 3rd-party apps, screen readers, and search. **The body remained hidden from the primary viewing surface.**

This change switches the reminder to `reddit.submitPost()` — a **plain text post** (not a custom app post). Plain text posts show the body on every Reddit client, get the full comment thread UI, and **drive discussion** which was the original goal. The "Open in Meetit to RSVP" deep link in the body is the entry point to the RSVP flow.

This change also bundles the existing `fix-bug2-cron-reminder-retry` proposal because it modifies the exact same CRON block:

1. **Retry window**: extend the reminder window by 1 hour after event start so CRON downtime doesn't silently drop reminders.
2. **Move dedup flag after success**: today, `remindedKey` is set BEFORE `submitCustomPost`; a failed post never retries. Move the flag into the success path so failed posts retry on the next 5-minute tick.

## Priority: 3/5

## Status: implemented (2026-06-19)

## What Changes

### 1. Switch reminder post from custom app post → plain text post

The CRON reminder at `src/server/server.ts:797` switches from:

```ts
reddit.submitCustomPost({
  title: `📢 Event Reminder: ${event.title} is happening ${event.date}!`,
  userGeneratedContent: { text: "# ${event.title}\n\n## 🗓️ ..." }
})
```

to:

```ts
reddit.submitPost({
  title: `🔔 Reminder: ${event.title} — ${event.date}`,
  text: buildReminderBody(event, organizer, mods, context.subredditName)
})
```

`buildReminderBody()` is a pure function in `src/shared/meetit.ts` that produces a markdown string with:

- `## 📅 ${event.date}` heading
- `## ⏰ ${event.time}` heading
- `## 📍 ${event.location}` heading (skipped if empty)
- `## 📝 About this event` + `event.description` (skipped if empty)
- `**Organized by:** u/${event.organizer}` line (fallback to `context.username` if no organizer)
- `**Moderators:** u/mod1 u/mod2 u/mod3` line (omitted if no mods configured)
- `🚀 [Open in Meetit to RSVP](https://www.reddit.com/r/${subredditName})` deep link (omitted if no subreddit)
- `---` separator + `💬 Drop a comment if you're going, ask questions, or coordinate rides!` CTA

### 2. Bundle `fix-bug2-cron-reminder-retry`

- **Extend window**: change `if (hoursUntilEvent > reminderHours || hoursUntilEvent < 0) continue;` to also allow `hoursUntilEvent >= -1` (i.e., post a reminder up to 1h after the event starts).
- **Move `remindedKey` after success**: change the order so `redis.set(remindedKey, "true")` happens ONLY after `submitPost` resolves successfully. A failed post will retry on the next CRON cycle.
- **Log success/failure**: add `serverLog("info", "[CRON] Reminder post sent for " + event.title + " (postId=" + post.id + ")")` on success; log the error with full context on failure.

## Capabilities

### New Capabilities
- `reminder-system`: Spec for CRON-triggered reminder posts. Bundles the existing `cron-reminder-retry` capability into a unified reminder-system capability.

### Modified Capabilities
- None.

## Impact

- `src/shared/meetit.ts`: add `buildReminderBody()` pure function (testable, no Devvit imports).
- `src/server/server.ts`:
  - Import `buildReminderBody` from `../shared/meetit.ts`.
  - Add `parseModList()` helper (next to `normalizeTimezone`).
  - Replace the `submitCustomPost` call in `onCheckEvents` with `submitPost`.
  - Fetch `mod_usernames` setting once per CRON run.
  - Move `remindedKey` set after successful `submitPost`.
  - Extend the skip condition to allow up to 1h after start.
  - Add `serverLog` on success and failure.
- `tools/meetit-behavior.test.ts`: add 9 test cases for `buildReminderBody()` covering full event, missing description, no organizer, no mods, whitespace location, always-CTA, mod list format, with-subreddit deep link, without-subreddit.

## Why this priority

This is a UX win for the **event organizer** (more discussion = higher attendance) and **attendees** (clearer event details on every Reddit client). It's also a defense-in-depth bug fix bundled in. The implementation is small (~95 lines changed across 2 files plus tests), and the API surface is documented and stable.

Not higher priority because the current behavior — a working reminder with hidden body — is functional; this is a polish + bug fix bundle.

## Out of Scope

- `runAs: 'USER'` reminder posts: would require app review per [User Actions docs](https://developers.reddit.com/docs/capabilities/server/userActions). We keep the app-account poster.
- Sticky comment automation.
- Re-posting or upgrading existing reminder posts (impossible — posts are immutable; new reminders just use the new format).
- Changing the `reminder_hours` default (24h stays).
- Per-RSVP DM reminders: `sendPrivateMessage({to: username})` is [documented broken in `LEARNINGS.md`](LEARNINGS.md) — only `to: "/r/subreddit"` (modmail) works from CRON.

## Correction history

- **2026-06-19 v1**: First implemented using `textFallback` on `submitCustomPost`. **Reverted after live testing** — the post still rendered the Meetit app iframe on new.reddit/mobile because `textFallback` is only used as a fallback on platforms that can't render the iframe.
- **2026-06-19 v2 (current)**: Re-implemented using `submitPost` (plain text post). Body now shows on every Reddit client. Added "Open in Meetit" deep link to maintain the RSVP entry point.
