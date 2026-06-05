# Meetit

A Reddit community meetup manager built on [Devvit](https://developers.reddit.com/). Let users discover, RSVP to, and organize real-world events directly inside your subreddit.

Built with Devvit Web (HTML/CSS/JS inline webview) and a Neo-Brutalist design system.

## What is Meetit?

Meetit turns your subreddit into a community event hub. Members can browse upcoming meetups, RSVP with their contact info, submit event ideas, and mods can approve/publish events from a dashboard. Everything happens inside Reddit — no external links required.

Designed for mobile-first use with card-based UIs, hard shadows, and bold typography.

## Core Features

### For Members
- **Browse Events** — Discover upcoming meetups in your community with date, time, location, and description
- **RSVP** — One-tap registration with optional email/phone for organizer contact
- **Update Contact** — Edit your email/phone after RSVPing without re-registering
- **My Stuff** — Tabbed personal dashboard: events you're attending, events you created, and ideas you pitched
- **Share** — Copy event post URL to clipbord for sharing

### For Organizers
- **Submit Events** — 4-step form with title, category, date/time, location, and description
- **Category System** — Pick from 12 categories (Tech, Sports, Food, Arts, etc.) with auto-assigned emoji badges
- **Track Attendees** — View RSVP list with contact details after publishing
- **My Events** — Manage your published and pending events in one place

### For Moderators
- **Mod Dashboard** — Tabbed view of pending events, published events, and submitted pitches
- **Approve/Decline** — Review and publish community-submitted events
- **Export CSV** — Copy attendee data (username, email, phone) to clipboard as CSV for spreadsheets
- **View RSVPs** — See full attendee list with contact details per event

## Tech Stack

- **Devvit Web** — Inline webview (HTML/CSS/JS) embedded in Reddit posts
- **TypeScript** — Full type safety across client and server
- **Redis** — All data stored via Devtaxon's Redis (hashes for events, sorted sets for RSVPs)
- **CRON Scheduler** — Automated event reminders and cleanup jobs
- **Neo-Brutalist Design** — Space Grotesk font, #ff69b4 pink + #ffff00 yellow, hard 4px borders and shadows

## Design Highlights

- **Card-Based Layout** — Every screen uses stacked cards, not scrolling lists
- **Horizontal Pagination** — Description overflow handled with Next/Prev buttons (no mobile scrolling issues)
- **Animated Loading** — Emoji cycle with bounce animation and progress bar
- **Compact Cards** — Content-height cards that don't waste space
- **Per-Action Locks** — Prevent double-submission on all destructive actions
- **Event Delegation** — Single handler for all dynamic button clicks (no memory leaks)

## Data Model

All data lives in Redis:

- `meetit:active_events` — Hash of published events
- `meetit:pending_events` — Hash of events awaiting mod approval
- `meetit:rsvps:{eventId}` — Sorted set of attendees per event
- `meetit:rsvp_details:{eventId}` — Hash of email/phone per attendee per event
- `meetit:pitched_ideas` — Hash of community-submitted ideas
- `meetit:settings` — App configuration (mod list, brand colors, etc.)

## Architecture

```
src/
  client/
    app.ts           — Core UI: card rendering, pagination, RSVP/leave, mod dashboard, overlays
  server/
    server.ts        — API handlers, Redis data layer, CRON jobs, settings
    index.ts         — Devvit Web server entry
  shared/
    api.ts           — TypeScript types and API endpoint constants
    meetit.ts        — Shared utilities (moderator check, RSVP parsing, event creation)
public/
  app.html           — Neo-Brutalist HTML/CSS with all overlays

tools/
  build.ts           — esbuild (client) + tsc (server) build script
```

## License

MIT
