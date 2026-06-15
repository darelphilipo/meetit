## Why

The `onRsvp` handler sends user email and phone to an external Google Sheets webhook (Zapier) without any user consent or disclosure. Users have no way to opt out, and if the webhook URL is compromised, all RSVP contact info leaks. This is a privacy violation and a regulatory risk (GDPR, CCPA).

## Priority: 5/5

## Status: proposed

## What Changes

- Add a "📨 Share my contact info with the organizer" checkbox in the RSVP form (step 1).
- Default state: unchecked (privacy-first).
- If unchecked, the server skips the webhook call entirely.
- If checked, the server sends the contact info to the webhook as before.
- Store the consent in Redis as `meetit:rsvp_consent:{eventId}:{username} = 1` (no TTL — long-lived record).
- Add a one-time disclosure: "Your contact info is shared with the event organizer via Zapier" in the RSVP form.
- Add `[FEATURE] rsvp-consent eventId={id} user={u} consented={bool}` server log.

## Capabilities

### New Capabilities
- `rsvp-consent`: User opt-in for sharing contact info with the event organizer via the external webhook.

### Modified Capabilities
- None.

## Impact

- `src/client/app.ts`: add consent checkbox in RSVP step 1. Pass consent flag in the RSVP POST body.
- `src/server/server.ts`: read `consented` from body, store in Redis, only call webhook if `consented === true`.
- `public/app.html`: checkbox styling, disclosure text styling.

## Risk Mitigation

- Default OFF (privacy-first).
- Persistent Redis key (no TTL) for audit trail.
- Server logs every consent decision.
- Future: consider a global kill switch via `devvit.json` settings to disable the webhook entirely (separate OpenSpec change).
