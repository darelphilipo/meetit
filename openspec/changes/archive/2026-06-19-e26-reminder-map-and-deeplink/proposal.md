## Why

After the e24 reminder system shipped, two user-visible issues remain in the reminder post body:

1. **Google Maps link is missing.** The event form has a "Google Maps Link (optional)" field (`public/app.html:482`). The form, the home card, and the mod event details all show the maps link. But `buildReminderBody()` doesn't include it — the user has to click into the Meetit app to see the map. This is a regression vs. the rest of the app.

2. **"Open in Meetit" deep link points to the subreddit homepage, not the Meetit app post.** Today, the link is `https://www.reddit.com/r/${subredditName}` — the subreddit's main feed. The user expects it to deep-link to the most recent Meetit app post (created via the `Create Meetit Post` menu action) so attendees can tap straight into the app to RSVP.

Both are simple fixes. The maps link needs `buildReminderBody` to read `event.mapUrl`. The deep link fix needs a new Redis key (`meetit:meetit_app_post_id`) that `onMenuCreatePost` writes and `onCheckEvents` reads.

## Priority: 3/5

## Status: proposed

## What Changes

### 1. Add Google Maps link to reminder body

`buildReminderBody()` gets a new `## 🗺️ Google Maps` section that renders the `event.mapUrl` as a clickable markdown link. Skipped entirely when the maps URL is empty/whitespace.

```
## 🗺️ [Open in Google Maps](https://maps.google.com/?q=...)
```

This is a one-block addition. The maps URL is stored on the event when the user submits the form; the body builder just needs to read it.

### 2. Track the Meetit app launcher post ID in Redis

When a mod clicks the `Create Meetit Post` menu action, `onMenuCreatePost()` creates a custom app post. We currently just `navigateTo(post.url)` — the post ID is lost.

This change persists the post ID in Redis under `meetit:meetit_app_post_id`. The CRON reminder loop reads it and passes the corresponding URL to `buildReminderBody()` as the `meetitAppPostUrl` parameter.

```ts
// In onMenuCreatePost, after the post is created:
await redis.set("meetit:meetit_app_post_id", post.id);
```

```ts
// In onCheckEvents, before the per-event loop:
const meetitPostId = (await redis.get("meetit:meetit_app_post_id")) || "";
const meetitAppPostUrl = meetitPostId
  ? `https://www.reddit.com/comments/${meetitPostId.replace(/^t3_/, "")}/`
  : undefined;
```

If the key is empty (fresh install, no launcher post yet), the deep link falls back to the subreddit homepage with a hint:

```
🚀 **[Open in Meetit to RSVP](https://www.reddit.com/r/meetup_hub2_dev)**
*Mods: create a "Meetit - Community Meetups" post first, then the link will go straight to the app.*
```

### 3. Update the body builder signature

`buildReminderBody()` gets a new optional 5th parameter `meetitAppPostUrl?: string`. When provided, the "Open in Meetit" deep link uses it instead of the subreddit homepage.

## Capabilities

### Modified Capabilities
- `reminder-system`: Add maps link section and use stored app post ID for deep link.

## Impact

- `src/shared/meetit.ts`:
  - `buildReminderBody()`: read `event.mapUrl` to add maps section (no signature change for the event arg — already optional via the existing `Pick<>`).
  - `buildReminderBody()`: new optional 5th param `meetitAppPostUrl?: string`.
- `src/server/server.ts`:
  - `onMenuCreatePost()`: write `meetit:meetit_app_post_id` to Redis on success.
  - `onCheckEvents()`: read the key, pass URL to `buildReminderBody()`. Fall back to `undefined` if not set.
- `tools/meetit-behavior.test.ts`: 4 new test cases (maps present, maps missing, deep link with meetit post URL, deep link without meetit post URL → fallback).

## Why this priority

Both are user-visible defects in a feature that already shipped. They:
- Reduce friction for the most common use case (looking up the venue on maps)
- Restore the deep-link intent (one tap from reminder → RSVP)
- Are small, surgical, and easy to verify

Not higher priority because:
- The current behavior is functional (users can still find the venue in the app; they can still get to the app via the subreddit front page).
- No data loss or security risk.

## Out of Scope

- **Stale post detection** — if the launcher post is deleted, the deep link 404s. Detection would require polling the post or listening for `PostDelete` triggers. Out of scope.
- **Multiple launcher posts** — `onMenuCreatePost` overwrites the key on each invocation. If mods create multiple launcher posts, only the most recent is used. Acceptable trade-off.
- **Map link validation** — we render whatever the user typed. No URL validation. The form is the trust boundary.
- **Custom subreddit display name** — the "Open in Meetit" link text is fixed. Could be made configurable in devvit.json settings later.
- **Migrating existing reminders** — posts are immutable. New reminders going forward will have the maps link; old ones (already created) won't.
