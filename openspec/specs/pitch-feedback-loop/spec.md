# pitch-feedback-loop Specification

## Purpose
TBD - created by archiving change pitch-feedback-loop. Update Purpose after archive.
## Requirements
### Requirement: Pitch feedback loop
The system SHALL provide the pitcher of a pitch with visible feedback that their idea was received, and SHALL show moderator actions (dismissed with reason) on the pitch in the pitcher's My Stuff instead of silently removing the row.

#### Scenario: Pitcher receives confirmation on submit
- **WHEN** a user submits a pitch via the pitch form
- **THEN** the system saves the pitch to `meetit:pitched_ideas`
- **AND** the system sends a private message to the user with the body: "💡 Your idea 'X' was received! Mods will review it soon. Track its status in My Stuff → Pitches (👤 → 💡 Pitches). — Meetit"
- **AND** the system shows a success toast in the app: "Idea received! 🎉 Mods will review it — check My Stuff for status."

#### Scenario: Mod dismisses a pitch with a reason
- **WHEN** a moderator clicks "🗑️ Dismiss" on a pitch in the mod dashboard
- **AND** enters a reason (1-100 characters) in the prompt
- **AND** confirms the dismiss
- **THEN** the server writes the pitch back to `meetit:pitched_ideas` with `status="dismissed"`, `dismissReason` set to the typed reason, `dismissedAt` set to the current ISO timestamp, `dismissedBy` set to the moderator's username
- **AND** the pitch is removed from the moderator's pending view (optimistic update + status filter)

#### Scenario: Mod cannot dismiss without a reason
- **WHEN** a moderator's dismiss request is missing or has an empty `reason`
- **THEN** the server returns `400 Bad Request` with the error message "Reason required"
- **AND** the pitch is NOT modified

#### Scenario: Mod cannot dismiss with an over-long reason
- **WHEN** a moderator's dismiss request has a `reason` longer than 100 characters
- **THEN** the server returns `400 Bad Request` with the error message "Reason must be 100 characters or less"
- **AND** the pitch is NOT modified

#### Scenario: Pitcher sees dismissed status in My Stuff
- **WHEN** a user views their My Stuff → Pitches tab
- **AND** the user has a pitch with `status="dismissed"`
- **THEN** the pitch card shows a status line: "❌ Dismissed: {dismissReason} · on {dismissedAt date} · by u/{dismissedBy}"

#### Scenario: Pending pitch renders with the legacy status line
- **WHEN** a user views their My Stuff → Pitches tab
- **AND** the user has a pitch with `status="pending"` (or no `status` field — legacy)
- **THEN** the pitch card shows: "📅 Pitched: {submittedAt date} · pending review"

#### Scenario: Owner hard-deletes their own pitch
- **WHEN** a user clicks "🗑️ Delete" on their own pitch in My Stuff → Pitches
- **THEN** the server hard-deletes the pitch from `meetit:pitched_ideas` (the row is removed; no `status` field is written)
- **AND** the user's view optimistically removes the row, matching the existing behavior
- **AND** if the owner is also a moderator, the OWNER path still takes priority — no reason is required (the owner is the one removing their own pitch from their own view, not a mod rejecting a community submission)

#### Scenario: Legacy pitch is read as pending
- **WHEN** the server reads a pitch from `meetit:pitched_ideas` that has no `status` field (legacy data from before this change)
- **THEN** the pitch is treated as `status="pending"` and renders with the "📅 Pitched: … · pending review" line in My Stuff

#### Scenario: Mod Pitches tab defaults to pending
- **WHEN** a moderator opens the Mod Dashboard → Pitches tab
- **THEN** the server returns only pitches with `status="pending"` (or no `status` field)
- **AND** the response includes `counts: { pending, dismissed, all }` so the client can show a "🗑️ View dismissed (N)" link
- **AND** tapping the link re-fetches with `?status=dismissed` (or `?status=all`) and shows a "← Back to pending" link to return

#### Scenario: DM on submit fails silently
- **WHEN** the user submits a pitch but the private message to the user fails to send
- **THEN** the server logs the error: `[PITCH] DM confirmation failed for u/{user}: {err}`
- **AND** the submission still succeeds (the pitch is saved and the toast is shown)
- **AND** the user sees the success toast and the row in My Stuff (the DM is a courtesy, not a guarantee)

