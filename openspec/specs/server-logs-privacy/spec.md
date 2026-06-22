# server-logs-privacy Specification

## Purpose
Debug panel privacy — the in-app debug panel (🐛 button) must be visible only to moderators. The server-side `requireMod()` check is the security boundary; client-side checks are defense in depth. All privacy-related log lines are tagged with `[H1-PRIVACY]` for greppability.

## Requirements
### Requirement: /api/server-logs requires mod authentication

The `/api/server-logs` endpoint SHALL return HTTP 403 (or a 401-equivalent error) when the current user is not a moderator of the subreddit (i.e., `await isMod()` returns false).

#### Scenario: Non-mod requests server logs
- **WHEN** a non-mod user (or a user with no mod entry in `mod_usernames` setting) calls `POST /api/server-logs`
- **THEN** the server returns an error response (status 403 or higher) without including any log entries
- **AND** the server logs the denied access attempt: `[H1-PRIVACY] [SERVER-LOGS] DENIED access to /api/server-logs for non-mod u/{username}`
- **AND** the denied attempt is written to `meetit:server_logs` via `serverLog("warn", ...)` for mod review

#### Scenario: Mod requests server logs
- **WHEN** a moderator of the subreddit calls `POST /api/server-logs`
- **THEN** the server returns the last 100 log entries from `meetit:server_logs`
- **AND** the server logs: `[H1-PRIVACY] [SERVER-LOGS] Returning {N} entries to mod u/{username}`
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
- **THEN** the click handler returns early (logs: `[H1-PRIVACY] debug toggle click IGNORED: not a mod`)
- **AND** no fetch to `/api/server-logs` is made

#### Scenario: Non-mod manually calls /api/server-logs
- **WHEN** a non-mod user uses dev tools to POST `/api/server-logs` directly
- **THEN** the server returns 403 (the security boundary holds)
- **AND** the denied attempt is logged for mod review

### Requirement: H1-PRIVACY log tag convention

All privacy-related log lines SHALL be prefixed with `[H1-PRIVACY]` for greppability. This applies to both client-side and server-side logs.

#### Scenario: Client-side privacy logs
- **WHEN** the client applies debug panel visibility
- **THEN** the log line includes `[H1-PRIVACY]` prefix
- **AND** the log includes the username: `[H1-PRIVACY] applyDebugPanelVisibility: SHOWING debug toggle for mod u/{user}` or `[H1-PRIVACY] applyDebugPanelVisibility: HIDING debug toggle for non-mod u/{user}`

#### Scenario: Server-side privacy logs
- **WHEN** the server handles `/api/server-logs`
- **THEN** all log lines include `[H1-PRIVACY] [SERVER-LOGS]` prefix

### Requirement: h1_nomod URL parameter for testing

The client SHALL support a `?h1_nomod=1` URL parameter that forces `cachedHomeIsMod = false` on the client side. This allows a mod to simulate the non-mod path for testing without needing a second Reddit account. The server-side `requireMod()` check remains the actual security boundary.

#### Scenario: Mod uses h1_nomod=1 parameter
- **WHEN** a mod opens the app with `?h1_nomod=1` in the URL
- **THEN** the client logs `[H1-PRIVACY] URL param h1_nomod=1 detected: forcing cachedHomeIsMod=false for testing`
- **AND** the debug toggle is hidden (simulating non-mod experience)
- **AND** the server-side security boundary is unaffected

