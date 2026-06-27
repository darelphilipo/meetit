# debug-panel-install-gate Specification

## Purpose
TBD - created by archiving change debug-panel-install-gate. Update Purpose after archive.
## Requirements
### Requirement: Debug panel hidden by default
The system SHALL hide the debug log panel 🐛 button by default for all users, including moderators. The button SHALL only be revealed when both conditions are met: (1) the user is a moderator of the subreddit, AND (2) the subreddit's App Installation Setting `show_debug_panel` is set to `true`.

#### Scenario: Mod sees no button by default
- **WHEN** a moderator loads the app on a fresh install (or any install where the `show_debug_panel` setting is `false` or unset)
- **THEN** the 🐛 button is hidden
- **AND** the client logs `[DEBUG] panel hidden — enable show_debug_panel in App Installation Settings` once

#### Scenario: Mod opts in via App Installation Settings
- **WHEN** a moderator loads the app on an install where `show_debug_panel` is `true`
- **THEN** the 🐛 button is visible
- **AND** clicking it opens the debug panel (existing behavior)
- **AND** the client logs `[DEBUG] panel enabled`

#### Scenario: Non-mod never sees the button
- **WHEN** a non-moderator loads the app on any install (regardless of the `show_debug_panel` setting)
- **THEN** the 🐛 button is hidden
- **AND** the server-side `requireMod()` gate on `/api/server-logs` continues to return 403 for non-mod requests (defense in depth)

### Requirement: Setting is read per-request
The system SHALL read the `show_debug_panel` setting from Redis on every `/api/init` and `/api/home` request, so changes to the setting take effect on the next request after the mod saves it in App Installation Settings (no app restart needed).

#### Scenario: Setting change is reflected without restart
- **WHEN** a moderator flips `show_debug_panel` from `false` to `true` in App Installation Settings
- **AND** the moderator refreshes the app or navigates to a new page
- **THEN** the next `/api/init` or `/api/home` response includes `settings.show_debug_panel = true`
- **AND** the 🐛 button becomes visible immediately on the next render

