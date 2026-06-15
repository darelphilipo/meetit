## Why

Devvit push notifications are gated in beta and require manual approval. However, we can prepare the UX now: store user opt-in intent in Redis so that when push notifications are approved, no migration work is needed. The existing CRON reminder posts (which work today) remain the fallback.

## Priority: 1/5

## Status: future (Devvit push notifications gated; requires manual approval form)

## What Changes

- After a successful RSVP, show a "🔔 Remind me before this event" checkbox in the success state.
- If checked, store `meetit:notify_opt_in:{eventId}:{username} = 1` in Redis with TTL = 7 days.
- Add `/api/notify-opt-in` endpoint to record/unrecord the opt-in.
- Add `permission.notification` to `devvit.json` (currently not present; will be required when push is enabled).
- When Devvit push notifications are approved, the CRON reminder job (already running every 5 min) will read these opt-ins and send push notifications 24h, 3h, and 30min before each event to opted-in users.
- For now (before push approval), the opt-in is recorded but no notification is sent beyond the existing CRON modmail fallback.

## Capabilities

### New Capabilities
- `notify-opt-in`: User opt-in for push notifications, stored in Redis. Push delivery gated on Devvit approval.

### Modified Capabilities
- None (this is additive).

## Impact

- `src/shared/api.ts`: new `NOTIFY_OPT_IN` endpoint constant.
- `src/server/server.ts`: new `onNotifyOptIn` handler. Update CRON `onCheckEvents` to read opt-ins and (when push is enabled) send notifications.
- `src/client/app.ts`: new "Remind me" checkbox in RSVP success state. New `notify-opt-in` action handler.
- `public/app.html`: checkbox styling.
- `devvit.json`: add `permissions.devvit:push-notifications` (commented out until approved).
- `LEARNINGS.md`: document the opt-in storage pattern.

## Blocked By

- Devvit push notification approval (manual form, beta-gated, 2/user/day, 25K/app/day limits).

## Why Still Track It

- Storing intent now means zero migration work when approved.
- The UX is trivial (one checkbox in an already-existing success state).
- A future change to actually wire up the push delivery can be a separate OpenSpec change (`enable-push-notifications`).
