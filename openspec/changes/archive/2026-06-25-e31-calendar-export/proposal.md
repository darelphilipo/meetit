# e31-calendar-export

**Priority:** 3/5 (standard enhancement)

## Why

A "Add to Calendar" feature is a standard expected capability for event apps. Users who see a reminder post or share post want a frictionless way to save the event to their personal calendar without manually transcribing dates/times.

## What changed from the original plan

The **original e31 plan** added an in-app "📅 Add to Calendar" button on the event details overlay and RSVP success card. Manual testing on r/meetup_hub2_dev revealed that opening external URLs from a Devvit webview crashes the post iframe with the error "this post failed to load because of an unknown error." Root cause: the Devvit webview sandbox lacks the `allow-popups` and `allow-top-navigation` flags needed for `window.open()` or `window.location.href`. `navigateTo` (the Devvit Web global at `app.ts:3`) only works for Reddit-internal URLs.

**Revised plan:** Put the calendar link in the **post body** of reminder posts and RSVP share posts. These are plain text posts (per LEARNINGS §27) that render in the native Reddit client, where external links work fine and show Reddit's native external-link confirmation dialog. This also reaches more users (anyone reading the post, not just app users).

## What changes

- New `buildGoogleCalendarUrl(event, timezone)` pure function in `src/shared/meetit.ts`
- `buildReminderBody` adds a `## 📅 [Add to Google Calendar](...)` section after the Maps section
- `buildRsvpShareBody` adds the same section after its Maps section
- Section is omitted when `event.date` is missing or malformed
- All in-app e31 client-side changes (helper, button, handler) are reverted

## Out of scope

- **In-app "Add to Calendar" button** — explicitly REMOVED. The Devvit webview sandbox blocks external navigation (window.open, window.location.href) and the global `navigateTo` only supports Reddit-internal URLs. Re-introducing this would require Reddit to add `allow-popups` and `allow-top-navigation` to the webview sandbox, which is not in the platform's roadmap.
- **`.ics` file clipboard copy** — same reason; downloading from a sandboxed iframe is blocked
- **Apple Calendar (`webcal://`) support** — not relevant since the calendar is now in posts (Reddit's native link handling covers all calendar apps via the browser)
- **Outlook / Yahoo direct links** — can be added later as additional sections in the post body
- **Calendar export from My Stuff → RSVPs card** — events don't have start times in My Stuff; the post-body approach reaches users wherever they encounter the event
- **Custom end times** — defaults to start + 1 hour; events don't have an end-time field

## Capabilities

### New Capabilities
- `calendar-export`: Google Calendar link in reminder and share post bodies

## Impact

- `src/shared/meetit.ts`: +55 lines (1 helper function, 2 small additions to existing body builders)
- `src/client/app.ts`: net -83 lines (reverted all e31 client-side changes)
- `tools/meetit-behavior.test.ts`: +11 tests for the calendar URL helper and updated body functions
- `openspec/specs/calendar-export/spec.md`: new spec (3 requirements, 9 scenarios)
- `openspec/changes/e31-calendar-export/`: change proposal for archival (rewritten)

## Task list

See `tasks.md`.
