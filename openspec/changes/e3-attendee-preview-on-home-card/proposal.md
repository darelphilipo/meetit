## Why

Users currently have to click "View Details →" then navigate to step 3 of the event details overlay to see who's going. That's three taps for basic social proof. Showing a mini avatar row directly on the home card (e.g., "👤👤👤 +2") is the standard pattern for event apps and dramatically increases RSVP conversion.

## Priority: 5/5

## Status: proposed

## What Changes

- The `/api/home` response includes, for each event, the first 3 attendee usernames (`attendeePreview: string[]`).
- The home card renders a row of small avatar circles (initials in colored circles) below the metadata.
- If more than 3 attendees exist, append " +N" text after the avatars.
- Use the same color palette as the mod attendee badges (or new consistent palette).
- Cap the preview at 3 avatars to keep the card compact.
- The full attendee list is still in the details overlay; this is just a teaser.

## Capabilities

### New Capabilities
- `attendee-preview`: Mini avatar row on home cards showing first 3 attendees + remaining count.

### Modified Capabilities
- None.

## Impact

- `src/shared/api.ts`: extend `HomeState` (or event entry) with `attendeePreview: string[]` and `attendeeCount: number`.
- `src/server/server.ts`: in `onHome`, after fetching events, batch-query the first 3 attendees for each event with `Promise.all` and `zRange` with `limit 0,3`.
- `src/client/app.ts`: in `renderHomeCard`, render the avatar row using `attendeePreview`.
- `public/app.html`: new `.attendee-preview` and `.attendee-avatar` CSS classes.

## Performance Note

The batch query adds N additional `zRange` calls (where N = number of events). For 20 events, that's 20 calls. To stay fast, run them in `Promise.all`. If `Promise.all` is too slow in practice, switch to a single Redis pipeline call. Profile before optimizing.

## Design Decisions (to finalize in design.md)

- **Avatar color:** random per-username (hash → HSL) for stable per-user color, OR a small fixed palette indexed by `username.charCodeAt(0) % palette.length`.
- **Click target:** avatars are visual only in v1; tapping does nothing. Future: tap an avatar to see profile.
- **Empty state:** when no one is RSVP'd, hide the row entirely.
- **Privacy:** only show usernames of users who explicitly RSVP'd; no email/phone leak.
