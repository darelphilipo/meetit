## ADDED Requirements

### Requirement: Mod can approve a pitch
The system SHALL allow a moderator to approve a pending pitch via a new `POST /api/approve-idea` endpoint. The endpoint requires the actor to be a moderator and SHALL soft-save the pitch with `status="approved"`, `approvedAt` set to the current ISO timestamp, and `approvedBy` set to the moderator's username.

#### Scenario: Mod approves a pending pitch
- **WHEN** a moderator clicks "✅ Approve" on a pitch in the mod dashboard
- **AND** confirms the approve in the overlay
- **THEN** the server writes the pitch back to `meetit:pitched_ideas` with `status="approved"`, `approvedAt`, `approvedBy`
- **AND** the system returns success
- **AND** the mod dashboard refetches the Pitches tab; the pitch disappears from the pending view
- **AND** a "✅ View approved (1)" link appears in the empty state

#### Scenario: Approve is idempotent
- **WHEN** a moderator clicks "✅ Approve" on a pitch that already has `status="approved"`
- **THEN** the server returns success without re-writing the row and without re-sending the DM
- **AND** the server logs `[APPROVE-IDEA] ignored: pitch {id} already has status="approved"`

#### Scenario: Non-mod cannot approve
- **WHEN** a non-moderator calls `POST /api/approve-idea` (even with a valid `ideaId`)
- **THEN** the server returns 403 Forbidden
- **AND** the pitch is NOT modified

#### Scenario: Approve of non-existent pitch
- **WHEN** a moderator calls `POST /api/approve-idea` with an `ideaId` that doesn't exist
- **THEN** the server returns 404 Not Found
- **AND** the server logs `[APPROVE-IDEA] pitch {id} not found`

### Requirement: Approve sends a best-effort DM to the pitcher
The system SHALL send a private message to the pitch's submitter after a successful approve action. The DM is best-effort — a DM failure SHALL NOT fail the approve action (the status is already set). The DM template is fixed and deterministic (see "DM template" requirement below).

#### Scenario: DM is sent on successful approve
- **WHEN** a moderator successfully approves a pitch
- **THEN** the server sends a private message to `idea.submittedBy` via `reddit.sendPrivateMessage`
- **AND** the server logs `[APPROVE-IDEA] Idea {id} approved by u/{mod}, DM sent to u/{user}` on success
- **AND** the server logs `[APPROVE-IDEA] DM failed for u/{user}: {error} (status still set to approved)` on failure
- **AND** the approve action returns success regardless of DM outcome

#### Scenario: DM template content
- **WHEN** the system builds the approve DM
- **THEN** the subject is `✅ Your Meetit pitch was approved!`
- **AND** the body includes the pitcher's username (with or without `u/` prefix, normalized)
- **AND** the body includes the pitch's title
- **AND** the body includes a CTA pointing the pitcher to the [+] menu to submit the event
- **AND** the body is signed "— Meetit Mods"

### Requirement: My Stuff shows approved status
The system SHALL render an "approved" status line in the pitcher's My Stuff → Pitches for pitches with `status="approved"`, parallel to the existing "dismissed" status line.

#### Scenario: Pitcher sees approved status in My Stuff
- **WHEN** a user views their My Stuff → Pitches tab
- **AND** the user has a pitch with `status="approved"`
- **THEN** the pitch card shows: "✅ Approved on {approvedAt date} by u/{approvedBy} — submit as event from the [+] menu"
- **AND** the pitch's [🗑️ Delete] button remains available (owner hard-delete still works)

#### Scenario: Pitcher sees pending status (unchanged)
- **WHEN** a user views their My Stuff → Pitches tab
- **AND** the user has a pitch with `status="pending"` (or no `status` field — legacy)
- **THEN** the pitch card shows: "📋 Pending review"

### Requirement: Mod Pitches tab supports approved filter
The system SHALL add a third filter state "approved" to the mod Pitches tab, parallel to the existing "pending" and "dismissed" filters. The default filter is "pending" (unchanged).

#### Scenario: Approved filter shows only approved pitches
- **WHEN** a moderator switches the Pitches tab to the "approved" filter
- **THEN** the server returns only pitches with `status="approved"`
- **AND** the response includes `counts: { pending, approved, dismissed, all }` so the client can render the cross-filter counts
- **AND** a "← Back to pending" link appears at the top

#### Scenario: View approved link appears in pending view
- **WHEN** the Pitches tab is on the default "pending" filter
- **AND** the response includes `counts.approved > 0`
- **THEN** the client renders a "✅ View approved (N)" link below the card
- **AND** tapping the link switches the filter to "approved"

#### Scenario: Pending view excludes approved pitches
- **WHEN** a moderator views the Pitches tab with `?status=pending`
- **THEN** pitches with `status="approved"` are NOT included
- **AND** pitches with `status="dismissed"` are NOT included
- **AND** only legacy (no status) and `status="pending"` pitches are returned

### Requirement: `pitchEffectiveStatus` returns three states
The system SHALL return one of three status values for any pitch read from `meetit:pitched_ideas`: `"pending"`, `"dismissed"`, or `"approved"`. Legacy pitches (no `status` field) are treated as `"pending"`.

#### Scenario: Status function returns approved
- **WHEN** a pitch has `status === "approved"`
- **THEN** `pitchEffectiveStatus(pitch)` returns `"approved"`

#### Scenario: Status function returns dismissed
- **WHEN** a pitch has `status === "dismissed"`
- **THEN** `pitchEffectiveStatus(pitch)` returns `"dismissed"`

#### Scenario: Status function returns pending for legacy
- **WHEN** a pitch has no `status` field, or `status === "pending"`, or `status` is any other value
- **THEN** `pitchEffectiveStatus(pitch)` returns `"pending"`

#### Scenario: Status function is case-sensitive
- **WHEN** a pitch has `status === "Approved"` (capital A) or `"APPROVED"` (all caps)
- **THEN** `pitchEffectiveStatus(pitch)` returns `"pending"` (case-sensitive, defensive against schema drift)
