# fix-privacy-issues

**Priority:** 5/5 (security fix)

## Why

The `meetit:server_logs` Redis key contains timestamps, log levels, and messages that include usernames, event IDs, RSVP actions, contact-presence flags, and sometimes error messages. The `/api/server-logs` endpoint returned this data without authentication, and the in-app debug panel (a 🐛 button in the bottom-right) called the endpoint for **any user** of the app. Any Redditor opening the app could:
1. Tap the 🐛 button
2. Read the last 100 server log entries (usernames of other Redditors, event IDs, who RSVPed, contact-presence flags, error messages)
3. Tap "📋 Copy All" to exfiltrate

This is the **biggest privacy issue** in the app. It's not catastrophic (logs don't include email/phone), but it leaks enough information for targeted abuse.

## What changes

| # | Sub-fix | File | Description |
|---|---------|------|-------------|
| 1 | Gate `/api/server-logs` behind `requireMod()` | `server.ts:onServerLogs` | The endpoint returns 403 to non-mods. Logs the denied access attempt. |
| 2 | Include `isMod` in `/api/init` response | `server.ts:onInit` | Lets the client know mod status at app boot (not just after home loads) |
| 3 | Hide debug toggle by default | `public/app.html` | `style="display: none;"` on `<button id="debug-toggle">` |
| 4 | Show debug toggle for mods only | `client/app.ts:applyDebugPanelVisibility` | New helper that reveals the toggle when `cachedHomeIsMod === true` |
| 5 | Guard `fetchServerLogs()` | `client/app.ts:fetchServerLogs` | Bails out early if not a mod (avoids the 403 roundtrip) |
| 6 | Guard debug toggle click handler | `client/app.ts:DOMContentLoaded` | Returns early if a non-mod manipulates the DOM to click the hidden button |

## Defense in depth

| Layer | Check | What it prevents |
|-------|-------|------------------|
| HTML | `style="display: none;"` on the toggle | Non-mods see nothing in the DOM |
| Client click handler | `if (!cachedHomeIsMod) return;` | DOM manipulation tricks can't bypass the UI |
| Client fetchServerLogs | `if (!cachedHomeIsMod) return;` | Avoids the network roundtrip; logs the skip |
| Server endpoint | `await requireMod()` | **The real security boundary** — non-mods get 403 even if they bypass the client |
| Server init | `isMod` field | Lets the client know mod status at boot, not just after home loads |

## Out of Scope

- **Removing the debug panel entirely** — useful for mod debugging during development and ops. The H1 fix is the right balance: server logs are still accessible, just only to mods.
- **Adding a "request logs" feature for non-mods** — different feature, requires UX design for what subset of logs to expose.
- **Audit log of who accessed server logs** — could be added later if the privacy concern is about mod surveillance rather than public exposure.

## Cross-references

- `LEARNINGS.md §1` (surgical change rule) — this is 4 small changes, not a new feature
- `LEARNINGS.md §59` (e28.9 logging) — the new `isMod` field flows through the same init response
- `openspec/specs/mod-dashboard/spec.md` — the mod context for this change
- `src/server/server.ts:onInit` — new `isMod` field
- `src/server/server.ts:onServerLogs` — new `requireMod()` gate
- `src/client/app.ts:applyDebugPanelVisibility` — new helper
- `public/app.html:559` — new `display: none` on toggle
