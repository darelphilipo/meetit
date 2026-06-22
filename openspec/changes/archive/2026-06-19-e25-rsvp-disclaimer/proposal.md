## Why

Today, the RSVP form in `public/app.html` collects a username, email, and phone, but provides **no disclosure** to the user about who can see that information. The organizer and subreddit moderators can view the full RSVP list (per the existing `organizer-attendees` and `mod-dashboard` specs), but attendees may not realize this when submitting.

This is a privacy-transparency issue. Users deserve to know, before they submit, that the organizer and mods can see their contact details. This is especially important in community apps where users might assume their data is private to themselves.

This change adds a small, non-blocking disclaimer line in the RSVP form that discloses this — matching the existing disclaimer style already used on the event-submit form (`app.html:497`).

**This is a disclosure, not a consent gate.** No checkbox, no opt-in step, no behavioral change. The RSVP submission flow stays exactly the same. The change is purely a 2-line UI addition to make existing data-sharing behavior transparent.

## Priority: 2/5

## Status: proposed

## What Changes

### 1. Add a 2-line disclaimer text to the RSVP form

In `public/app.html`, add a small text block immediately above the "Confirm RSVP" button in the RSVP overlay. The text is informational only, styled to match the existing disclaimer on the event-submit form (`font-size:11px;color:var(--muted);margin-top:10px;line-height:1.4`).

The disclaimer reads:
> 🔒 **Your RSVP details (username, email, phone) are visible to the event organizer and subreddit moderators.** Redditors who view the event see only your username. You can leave the event anytime from My Stuff.

This is intentionally non-alarming, uses neutral language, and tells users:
- What data is shared (username, email, phone)
- With whom (organizer + mods)
- What the public sees (username only — already documented in `organizer-attendees` spec)
- The escape hatch (leave from My Stuff — already exists)

### 2. No server-side changes

- No new `consented` field on `RsvpFormData`
- No new Redis key
- No new endpoint
- No changes to `onRsvp()` in `server.ts`
- No new permissions in `devvit.json`
- No new OpenSpec requirements on the server-side

The data-sharing behavior is **already implemented**; this change only makes it **visible to the user**.

## Capabilities

### New Capabilities
- `rsvp-disclosure`: Spec for transparent disclosure of RSVP data visibility in the RSVP form.

### Modified Capabilities
- None.

## Impact

- `public/app.html`: add ~3 lines of HTML inside the `#rsvp-overlay` block.
- No JS, CSS, or server-side changes.
- No new tests needed (the change is static HTML — no logic to test).

## Why this priority

This is a privacy-transparency win for users with a tiny implementation footprint (~3 lines of HTML). The cost of NOT doing it is reputational — if an attendee later discovers the organizer/mods can see their email, they may feel their trust was violated, even though the behavior was always documented in the spec.

Not higher priority because:
- The data-sharing behavior is already opt-in (attendee chooses to RSVP)
- Existing users can leave via My Stuff
- This is purely a UX clarity change, not a security or bug fix

## Why a new spec (not extending webhook-consent)

The existing `webhook-consent` spec at `openspec/specs/webhook-consent/spec.md` is **stale and mis-scoped**:
- It was created for a third-party webhook feature that was removed in commit `3e9a00a` ("remove external webhook entirely — no external data integration needed")
- It specifies a consent gate (checkbox) and `consented: true/false` server handling
- Neither code exists in the app
- The spec text acknowledges this with a "NOT YET IMPLEMENTED" banner

The current change is fundamentally different — it's a **disclosure** (informational) for an **internal** data-share (organizer/mods), not a **consent gate** (blocking) for an **external** data-share (webhook). Conflating them would muddy both specs.

**Recommendation:** Add the new `rsvp-disclosure` spec; leave `webhook-consent` alone for now (or update separately with a clear deprecation note, in a follow-up change).

## Out of Scope

- Consent gate (checkbox that blocks RSVP if unchecked) — out of scope; user asked for disclosure, not consent
- Audit log of who viewed RSVP data — separate security feature
- Email/phone encryption — separate security feature
- Granular sharing controls (e.g., "share with organizer but not mods") — would require schema changes
- Localization of the disclaimer text — would require i18n infrastructure
- Replacing the existing `webhook-consent` spec — leave for a separate cleanup change
