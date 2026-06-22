# server-logs-privacy Specification

## Purpose
TBD - created by archiving change fix-privacy-issues. Update Purpose after archive.
## Requirements
### Requirement: /api/server-logs requires mod authentication

The `/api/server-logs` endpoint SHALL return HTTP 403 (or a 401-equivalent error) when the current user is not a moderator of the subreddit (i.e., `await isMod()` returns false).

#### Scenario: Non-mod requests server logs
- **WHEN** a non-mod user (or a user with no mod entry in `mod_usernames` setting) calls `POST /api/server-logs`
- **THEN** the server returns an error response (status 403 or higher) without including any log entries
- **AND** the server logs the denied access attempt: `[SERVER-LOGS] DENIED access to /api/server-logs for non-mod u/{username}`
- **AND** the denied attempt is written to `meetit:server_logs` via `serverLog("warn", ...)` for mod review

#### Scenario: Mod requests server logs
- **WHEN** a moderator of the subreddit calls `POST /api/server-logs`
- **THEN** the server returns the last 100 log entries from `meetit:server_logs`
- **AND** the response includes the username of the requesting mod in the log line

### Requirement: /api/init returns isMod

The `/api/init` response SHALL include an `isMod: boolean` field so the client can determine mod status at app boot (not just after `/api/home` loads).

#### Scenario: Mod opens the app
- **WHEN** any user opens the app
- **THEN** the `/api/init` response includes `isMod: true` if the user is a mod, or `isMod: false` otherwise
- **AND** the server logs the init with the mod status: `[INIT] username={user} isMod={true|false}`

### Requirement: Debug panel UI is hidden for non-mods

The in-app debug panel (the 🐛 button in the bottom-right corner) SHALL NOT be visible to non-mods. The panel may be visible to mods (and to mods only) for development and ops debugging.

#### Scenario: Non-mod opens the app
- **WHEN** a non-mod user opens the app
- **THEN** the debug toggle button is hidden (`style="display: none;"` in the initial HTML, never revealed for non-mods)
- **AND** even if a non-mod manipulates the DOM to show the button, the click handler returns early without calling the server endpoint

#### Scenario: Mod opens the app
- **WHEN** a mod opens the app
- **THEN** the debug toggle button is revealed (CSS `display` property is set back to default)
- **AND** clicking the toggle shows the panel with both local client logs and server logs (fetched via `/api/server-logs`)

### Requirement: Client-side checks are defense in depth

The client-side checks (`if (!cachedHomeIsMod) return;` in the click handler and `fetchServerLogs`) SHALL be present as defense in depth, but they are NOT the security boundary — they exist to avoid unnecessary network roundtrips and to provide better UX. The server-side `requireMod()` check in `/api/server-logs` is the actual security boundary.

#### Scenario: Non-mod manipulates DOM to click the hidden toggle
- **WHEN** a non-mod user manipulates the DOM to make the debug toggle button visible and clicks it
- **THEN** the click handler returns early (logs: `debug toggle click IGNORED: not a mod`)
- **AND** no fetch to `/api/server-logs` is made

#### Scenario: Non-mod manually calls /api/server-logs
- **WHEN** a non-mod user uses dev tools to POST `/api/server-logs` directly
- **THEN** the server returns 403 (the security boundary holds)
- **AND** the denied attempt is logged for mod review

