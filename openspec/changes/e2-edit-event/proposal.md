## Why

Organizers who need to fix a typo, change the date, or update the location of their event currently have to delete and resubmit. This loses all RSVPs and any CRON-reminder state. It's a top user complaint for any event platform.

## Priority: 3/5

## Status: proposed

## What Changes

- Add a new `/api/edit-event` endpoint accepting the same payload as `/api/submit-event` plus the `eventId`.
- Owner-or-mod authorization (same as delete).
- Update the event hash in place via `hSet`; do NOT delete or recreate the event.
- The event keeps its `id`, `createdAt`, RSVP set, and CRON state.
- The event returns to "pending" review only if a mod edits a published event and a non-trivial field changes (e.g., date, location, description); minor edits (typos in title) stay published.
- Add "✏️ Edit" button in My Stuff (Events tab) for the owner, and in Mod Dashboard (Published tab) for mods.
- Reuse the existing 4-step create form, pre-filled with current event data.
- Add logging at every changed path per §0.2.

## Capabilities

### New Capabilities
- `edit-event`: In-place edit of pending or published events by owner or mod, with form pre-fill and field-level review rules.

### Modified Capabilities
- None.

## Impact

- `src/shared/api.ts`: new `EditEventFormData` type, new `EDIT_EVENT` endpoint constant.
- `src/server/server.ts`: new `onEditEvent` handler with `getEventById` + `isSubmissionOwner` + `requireMod` + `hSet`.
- `src/client/app.ts`: new `editEvent()` flow, form pre-fill, edit-mode indicator.
- `public/app.html`: edit button in My Stuff events + mod published cards.

## Decisions (to be made during design phase)

- **Form reuse:** keep the 4-step structure but add an "Edit mode" banner at the top.
- **Edit review rule:** for v1, ANY edit by a mod to a published event sets it back to "pending" for re-review. Simpler, safer.
- **Edit by organizer:** organizer can only edit their own events. If the event is already published, the edit re-triggers pending review.
