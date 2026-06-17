## Why

The `onRsvp` handler sends user email and phone to an external Google Sheets webhook (Zapier) without any user consent or disclosure. Users have no way to opt out, and if the webhook URL is compromised, all RSVP contact info leaks. This is a privacy violation and a regulatory risk (GDPR, CCPA).

## Priority: 5/5

## Status: moot (webhook removed)

## What Changes

> **Note: This change is now MOOT.** The external webhook was removed entirely on 2026-06-17 because no external data integration is being used. There is nothing to consent to. The proposal is archived as historical reference.

Originally called for:
- Add a "📨 Share my contact info with the organizer" consent checkbox in the RSVP form
- Only send to webhook if consented
- Store consent in Redis

Since the webhook no longer exists, none of these changes are needed.

## Resolution

- `src/server/server.ts`: `GOOGLE_SHEETS_WEBHOOK_URL` constant and the `if (webhookUrl) { fetch(...) }` block **removed** entirely.
- No external data is sent anywhere on RSVP.
- The GDPR/CCPA concern is fully resolved by removal rather than consent.
