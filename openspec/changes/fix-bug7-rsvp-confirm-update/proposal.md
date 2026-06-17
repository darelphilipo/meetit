## Why

When a user re-RSVPs to an event with a different email/phone, the RSVP sorted set's `zAdd` updates the timestamp silently, and the contact info in `rsvp_details` is updated without any user feedback. The user may not realize their contact info changed.

## Priority: 2/5

## Status: partial

## Audit (2026-06-17)

**Partially implemented.** Pre-filling of email/phone on re-RSVP EXISTS (`app.ts:1728-1729`): `showUpdateRsvpOverlay()` fetches existing data via `/api/my-rsvp`, then calls `showRsvpOverlay(id, email, phone)` which pre-fills the inputs. The overlay title changes to `"✏️ Update Contact"` when re-RSVPing.

**Still missing:**
1. **No "You're updating your RSVP" banner** — there's no explanatory text inside the overlay body beyond the title change.
2. **Confirmation toast** on re-RSVP success — not implemented.
3. Tasks 1.1, 1.2, 2.1 (pre-fill + endpoint) are **done**. Tasks 1.3 (banner), 3 (confirmation toast), 4 (test) remain.

**Recommendation:** The remaining work is ~30 minutes. Narrow scope to just the banner + toast.

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
