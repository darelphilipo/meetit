# webhook-consent Specification

## Purpose
RSVP user consent for third-party contact sharing via webhook.

**⚠️ NOT YET IMPLEMENTED.** This spec was created during planning for change fix-sec1-webhook-consent, but the feature was archived before shipping. The codebase contains no consent checkbox, no disclosure text, and no server-side `consented` field handling. The RSVP overlay in `app.html` has no consent-related elements. This spec is retained for future implementation.
## Requirements
### Requirement: RSVPs require explicit user consent for contact sharing
The system SHALL require users to explicitly opt in to sharing their contact information with event organizers via the external webhook. Default state: opted out.

#### Scenario: RSVP without consent
- **WHEN** the user submits an RSVP with `consented: false` (or no `consented` field)
- **THEN** the server does NOT send the user's contact info to the webhook
- **AND** the RSVP succeeds normally

#### Scenario: RSVP with consent
- **WHEN** the user submits an RSVP with `consented: true`
- **THEN** the server sends the user's contact info to the webhook
- **AND** stores `meetit:rsvp_consent:{eventId}:{username} = 1` in Redis

### Requirement: RSVP form discloses third-party contact sharing
The system SHALL display a disclosure text in the RSVP form explaining that contact info is sent to a third-party integration when consent is given.

#### Scenario: Disclosure visible
- **WHEN** the user opens the RSVP form
- **THEN** the form shows: "Your contact info is sent to the event organizer via a third-party integration" next to the consent checkbox

