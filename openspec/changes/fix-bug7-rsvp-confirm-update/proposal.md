## Why

When a user re-RSVPs to an event with a different email/phone, the RSVP sorted set's `zAdd` updates the timestamp silently, and the contact info in `rsvp_details` is updated without any user feedback. The user may not realize their contact info changed.

## Priority: 2/5

## Status: partial

## Audit (2026-06-25)

**Partially implemented — toast done, banner + logging still missing.** Current state:

| Area | Status | Location |
|------|--------|----------|
| Pre-fill fetch | ✅ Done | `app.ts:1729` `showUpdateRsvpOverlay()` |
| Pre-fill fields | ✅ Done | `app.ts:1728` `showRsvpOverlay(id, email, phone)` |
| Endpoint `/api/my-rsvp` | ✅ Done | `server.ts:758-772` |
| Confirmation toast | ✅ Done | `app.ts:1794` `showToast(isUpdate ? "Contact info updated ✅" : ...)` |
| Internal logging | ❌ Missing | No `rsvp-updated` log per spec |
| Overlay body banner | ❌ Missing | No "✏️ You're updating your RSVP" text in overlay body |
| Manual test | ❌ Not done | No recorded test |

**What's left:** ~15 minutes — add the overlay body banner text. Toast is already implemented. Banner and logging tasks remain pending as of 2026-06-25.

## What Changes

- In the RSVP form, when the user is already RSVP'd, pre-fill the email/phone fields with the existing values (read from `/api/init` or a new endpoint).
- Show a banner: "✏️ You're updating your RSVP for this event."
- On successful re-RSVP, show a confirmation card with both old and new contact info, and a "Saved" toast.
- Server returns `wasExisting: true` in the response (already added in v1.3.3) — use that flag to drive the UI.

## Capabilities

### New Capabilities
- `rsvp-update-confirm`: Pre-fill contact info on re-RSVP and confirm the update with a visible toast/banner.

### Modified Capabilities
- None.

## Impact

- `src/client/app.ts`: read existing contact info on RSVP form open; show "updating" banner; show confirmation on success.
- `src/server/server.ts`: (no new logic — `wasExisting` flag already exists from v1.3.3).

## Note

The `wasExisting` flag and re-RSVP confirmation card are already in v1.3.3. This change adds the pre-fill of contact info to complete the experience.
