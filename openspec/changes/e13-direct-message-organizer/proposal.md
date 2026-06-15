## Why

Right now there is no way to contact an event organizer or pitch submitter from inside the app. `reddit.sendPrivateMessage({ to: username })` is confirmed broken in Devvit Web (LEARNINGS §42). Mods who need to ask a question about a pending event, and attendees who need to coordinate with the organizer, have to leave the app, find the username, and open Reddit's compose window manually. Friction kills the loop.

The working workaround: deep-link to Reddit's standard compose URL via `navigateTo`. The URL is a public Reddit URL, not an authenticated API call, so it does not hit the `sendPrivateMessage` codepath at all. One tap from a card opens Reddit's native compose window with the recipient pre-filled.

## Priority: 3/5

## Status: proposed

## What Changes

- Add a "✉️ Message Organizer" button in the event details overlay (attendee-facing, step 2 of the details flow).
- Add a "✉️ Message Organizer" button on each pending event card in the Mod Dashboard (mod-facing).
- Add a "✉️ Message Pitcher" button on each pitch card in the Mod Dashboard (mod-facing).
- All three buttons use a single `data-action="dm-user"` handler that calls `navigateTo("https://www.reddit.com/message/compose?to={username}")`.
- Username is escaped via `escapeAttr()` and stripped of any `u/` prefix before encoding.
- If the username is missing or empty, the button is not rendered (graceful degradation — we never link to `compose?to=` with nothing).
- Log `[FEATURE] dm-user opened target={username} source={details|mod-pending|mod-pitches}` to the debug panel on every tap.
- Document the CSP risk in a comment: Reddit's webview may block `message/compose` as a clickjacking vector. Fallback: `window.open()` in a follow-up if needed.

## Capabilities

### New Capabilities
- `dm-organizer`: One-tap deep link from app cards to Reddit's native compose window, pre-filled with the target username. Used by attendees (event details), mods (pending events), and mods (pitches).

### Modified Capabilities
- None.

## Impact

- `src/client/app.ts`: new `case "dm-user"` in `handleAction()`; new button in `openDetailsOverlay()` step 2; new button in `renderModCard()` for pending + pitches tabs; new `escapeAttr()` import confirmed already present.
- `public/app.html`: no CSS changes (reuses `.btn .btn-white .btn-sm`).
- `LEARNINGS.md`: §44 added when this is implemented (navigateTo compose URL workaround + CSP risk note).

## Out of Scope

- Group messages to multiple attendees (single-user only for v1).
- Showing the message in-app (out of webview; we cannot intercept Reddit's compose window).
- Modmail `/r/sub` (already works via `sendPrivateMessage`; see LEARNINGS §42 and fix-bug2).
- Editing the message body before opening (Reddit's compose URL supports `?subject=&message=` but adds complexity; defer to a separate change if requested).

## Decisions (to be made during design phase)

- **Button placement in mod card:** below the existing actions row, full width (`width:100%`), 8px padding, 12px font (matches the design tokens used elsewhere).
- **Confirm before opening:** no — `navigateTo` is non-destructive and the user is clearly tapping a labeled button.
- **Empty username guard:** if `organizer`, `submittedBy`, or equivalent is `""`, the button is omitted from the HTML rather than rendered in a disabled state (cleaner DOM, no dead buttons).
