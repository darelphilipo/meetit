## Why

When a mod approves an event, the current `onApproveEvent` is a pure state change — pending → active. The event becomes visible on the home page, and the daily CRON will eventually post a reminder 24h before the event. But between approval and the first reminder (which could be days or weeks away), there's no signal to the community that the event exists. Users who don't check the home page don't see it.

This creates a "dead zone" between approval and reminder. The mod-approved event sits in `meetit:active_events` silently, and discussion/planning has no home.

The fix: create a public announcement post on the subreddit immediately on approval. The post contains the full event details (date, time, location, map, calendar link, description, organizer) and a "Drop a comment to plan, coordinate, or ask questions" CTA. The post reuses the existing `buildReminderBody` infrastructure (no new body builder), so the announcement and reminders are consistent.

## Priority: 1/5

## Status: proposed

## What Changes

- New helper `buildAnnouncementTitle(event, location?)` in `src/shared/meetit.ts`. Pure, testable, deterministic. Title format: `📅 [New Meetup] {title} — {date} @ {location}`.
- `onApproveEvent` in `src/server/server.ts` posts the announcement AFTER the state change + auto-RSVP organizer step (and BEFORE the return). The post is a plain text post via `reddit.submitPost` (same pattern as `onCheckEvents` reminder posts).
- Post URL stored in Redis: `meetit:event_post:${eventId}` (so future iterations can reference it — e.g., to show "this event was announced here" in My Stuff).
- Logging: `[APPROVE] announcement post created url={post.url} for {event.title}` on success.
- New tests for the title helper in `tools/meetit-behavior.test.ts`.
- New OpenSpec change with 3-4 requirements.

## Capabilities

### New Capabilities
- `event-announcement-post`: When a mod approves an event, the system posts a public announcement on the subreddit containing the event details + a discussion CTA. The post URL is stored in Redis for future reference.

### Modified Capabilities
- None.

## Impact

- `src/shared/meetit.ts`: add `buildAnnouncementTitle` (~20 lines).
- `src/server/server.ts` `onApproveEvent`: add the post-creation block (~20 lines). No change to the existing state-change + auto-RSVP flow.
- `tools/meetit-behavior.test.ts`: 3-4 new tests for `buildAnnouncementTitle`.
- `openspec/changes/event-announcement-post/`: new change directory with proposal, tasks, spec.

## Note

This is a "discussion thread" post, not the reminder. The CRON reminder post (24h or 2h before the event) is separate and unchanged. The announcement fires once on approval; the reminder fires later as a separate post. Two posts, two purposes:

| Post | When | Purpose | CTA |
|---|---|---|---|
| Announcement | Immediately on approval | Start discussion, planning, coordination | "Drop a comment to plan, coordinate, or ask questions" |
| Reminder | 24h or 2h before event | Last-mile RSVP nudge | "Drop a comment if you're going, ask questions, or coordinate rides" |

The body content is largely the same (date, time, location, map, calendar, description, organized-by) — both use `buildReminderBody` with the same params. The only difference is the title and the closing CTA, which is just a tail sentence in the body. The current `buildReminderBody` already produces "Drop a comment if you're going, ask questions, or coordinate rides!" which works for the announcement too — close enough to "Drop a comment to plan" that we don't need a new body builder.

The post runs as the app account (via `reddit.submitPost` without `runAs`). This is the same pattern as the CRON reminder posts.
