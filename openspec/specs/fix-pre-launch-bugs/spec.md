# fix-pre-launch-bugs Specification

## Purpose
TBD - created by archiving change fix-pre-launch-bugs. Update Purpose after archive.
## Requirements
### Requirement: Organizer can see attendee contact details in-app
The system MUST allow the event owner (the user listed in `event.organizer`) to see attendee contact details (email, phone) in the in-app attendee view, in addition to moderators. This matches the existing `onExportAttendees` behavior which already grants owners access to the same data via CSV download.

#### Scenario: Organizer views their own event's attendees
- **WHEN** the event organizer (not a mod) calls `/api/rsvp-list` with `includeContactDetails: true` for an event they own
- **THEN** the response MUST include `email` and `phone` fields for each attendee (where present in storage)
- **AND** a server log line tagged `[FIX-01]` MUST be emitted with the path = `owner`

#### Scenario: Random non-owner non-mod attempts to view contact details
- **WHEN** a user who is neither the organizer nor a mod calls `/api/rsvp-list` with `includeContactDetails: true`
- **THEN** the response MUST NOT include `email` or `phone` fields for any attendee
- **AND** a server log line tagged `[FIX-01-WARN]` MUST be emitted

#### Scenario: Moderator views any event's attendees
- **WHEN** a mod calls `/api/rsvp-list` with `includeContactDetails: true` for any event
- **THEN** the response MUST include `email` and `phone` fields for each attendee (where present)
- **AND** a server log line tagged `[FIX-01]` MUST be emitted with the path = `mod`

### Requirement: Block RSVP to past events
The system MUST reject any RSVP attempt for an event whose date is before today's date in the event's timezone. The check MUST be a defensive explicit date comparison (not relying on `getActiveEvent` to filter), because a stale Redis entry or a direct API call could otherwise bypass the check.

#### Scenario: User attempts to RSVP to an event with yesterday's date
- **WHEN** a user calls `/api/rsvp` for an event whose `date` is before today (in the event's timezone)
- **THEN** the response MUST be HTTP 400 with `error: "Cannot RSVP to past events"`
- **AND** a server log line tagged `[FIX-02-BLOCK]` MUST be emitted with the eventId, eventDate, and username

#### Scenario: User RSVPs to an event scheduled for today
- **WHEN** a user calls `/api/rsvp` for an event whose `date` is today (in the event's timezone)
- **THEN** the RSVP MUST succeed (today's events are not "past")
- **AND** a server log line tagged `[FIX-02-ALLOW]` MUST be emitted

#### Scenario: Event has a malformed date string
- **WHEN** a user calls `/api/rsvp` for an event whose `date` is missing, empty, or not a parseable date
- **THEN** the RSVP MUST be allowed (defensive default: don't silently block due to bad data)
- **AND** a server warning log MUST be emitted noting the malformed date

### Requirement: API response types cover all server return values
The TypeScript `ApiResponse` union MUST include every `type` discriminator that any handler can return. Specifically:
- `init` MUST include `isMod: boolean`
- `approve-idea` MUST be a valid variant
- `cleanup-aged` MUST be a valid variant

#### Scenario: `tsc --build` reports 0 type errors for the API response union
- **WHEN** a developer runs `npx tsc --build`
- **THEN** the `isMod` field, the `approve-idea` variant, and the `cleanup-aged` variant MUST all type-check without error

### Requirement: Form-step variables in `eventNext` are uniquely named
The `eventNext()` function in `src/client/app.ts` MUST NOT redeclare the same `var` name in different `else if` branches with incompatible types. The current code declares `titleEl`, `dateEl`, `timeEl`, `locEl`, `catEl` in both step 2 and step 3 with different inferred types (HTMLElement vs string), which fails `tsc --build` with TS2403.

#### Scenario: `tsc --build` reports 0 redeclaration errors
- **WHEN** a developer runs `npx tsc --build`
- **THEN** the `eventNext` function in `src/client/app.ts` MUST NOT produce any TS2403 errors
- **AND** the step-3 form-value reads MUST be in variables whose names do not collide with the step-2 element references

### Requirement: Clearing RSVP contact info removes stored contact info
The system MUST remove the user's contact info from `meetit:rsvp_details:{eventId}` when the user updates their RSVP with both email and phone blank. The current behavior only writes to the details hash when at least one field is present, leaving stale contact info in storage.

#### Scenario: User updates RSVP with both email and phone blank
- **WHEN** a user calls `/api/rsvp` for an event they are already RSVPed to, with both `email` and `phone` blank
- **THEN** the user's entry MUST be removed from `meetit:rsvp_details:{eventId}` (not just left as-is)
- **AND** a server log line tagged `[FIX-04-CLEAR]` MUST be emitted

#### Scenario: User updates RSVP with at least one contact field present
- **WHEN** a user calls `/api/rsvp` for an event with at least one of `email` or `phone` non-blank
- **THEN** the user's entry in `meetit:rsvp_details:{eventId}` MUST be written with the new values
- **AND** a server log line tagged `[FIX-04-WRITE]` MUST be emitted with the hasEmail/hasPhone flags

### Requirement: Regressions are caught by tagged log lines
The system MUST emit a tagged server log line for each of the four bug fixes, so the in-app debug panel and the `meetit:server_logs` zset make any future regression visible. Tag prefixes: `[FIX-01]`, `[FIX-02-BLOCK]`, `[FIX-02-ALLOW]`, `[FIX-04-CLEAR]`, `[FIX-04-WRITE]`.

#### Scenario: Mod views debug panel after a contact-details request
- **WHEN** a mod opens the in-app debug panel
- **THEN** they MUST be able to find the most recent contact-details requests by searching for `[FIX-01]`

#### Scenario: Mod investigates why a past event RSVP was rejected
- **WHEN** a user reports that they could not RSVP to an event
- **THEN** the mod MUST be able to find the rejection reason by searching for `[FIX-02-BLOCK]` in the debug panel

#### Scenario: Mod investigates contact-info deletion
- **WHEN** a user reports that their contact info was removed
- **THEN** the mod MUST be able to find the deletion event by searching for `[FIX-04-CLEAR]` in the debug panel

