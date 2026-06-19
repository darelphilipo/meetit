## 1. Server: no server changes

- [x] 1.1 Confirm: this is a pure client-side change. No `/api/*` endpoint changes. Document this in the change summary so future readers know the server was intentionally untouched.

## 2. Client: add the action handler

- [x] 2.1 In `app.ts`, locate `handleAction()` and add a new `case "dm-user":` branch
- [x] 2.2 Read `id` (the username, possibly prefixed with `u/`) from the clicked element's `data-id`
- [x] 2.3 Strip any `^u\/` prefix: `var username = id.replace(/^u\//, "");`
- [x] 2.4 If `username` is empty after strip, return early (no-op, log a warning)
- [x] 2.5 Call `navigateTo("https://www.reddit.com/message/compose?to=" + encodeURIComponent(username))`
- [x] 2.6 Log: `log("dm-user opened target=" + username + " source=" + (source||"unknown"))` where `source` is passed via `data-source` (details / mod-pending / mod-pitches)

## 3. Client: add buttons to three call sites

### 3.1 Event details overlay (attendee-facing, step 2)
- [x] 3.1.1 In `openDetailsOverlay()`, in the step-2 organizer block, append a `<button>` with `data-action="dm-user"`, `data-id="u/" + escapeAttr(event.organizer)`, `data-source="details"`
- [x] 3.1.2 Use class `btn btn-white btn-sm`, full width, 8px padding, 12px font
- [x] 3.1.3 If `event.organizer` is empty string, omit the button entirely
- [x] 3.1.4 Label: "✉️ Message Organizer"

### 3.2 Mod Dashboard — pending events tab
- [x] 3.2.1 In `renderModCard()` for the pending tab, append a `<button>` after the existing action buttons
- [x] 3.2.2 Attributes: `data-action="dm-user"`, `data-id="u/" + escapeAttr(item.organizer)`, `data-source="mod-pending"`
- [x] 3.2.3 If `item.organizer` is empty, omit
- [x] 3.2.4 Label: "✉️ Message Organizer"

### 3.3 Mod Dashboard — pitches tab
- [x] 3.3.1 In `renderModCard()` for the pitches tab, append a `<button>` after the existing action buttons
- [x] 3.3.2 Attributes: `data-action="dm-user"`, `data-id="u/" + escapeAttr(item.submittedBy)`, `data-source="mod-pitches"`
- [x] 3.3.3 If `item.submittedBy` is empty, omit
- [x] 3.3.4 Label: "✉️ Message Pitcher"

## 4. Logging & Polish

- [x] 4.1 Add `log()` calls at every changed path per §0.2
- [x] 4.2 Verify the debug panel shows the log on every button tap (no silent failures)
- [ ] 4.3 Manual test on iOS Safari + Android Chrome that `navigateTo` to `message/compose?to=X` works
- [ ] 4.4 If `navigateTo` is blocked, fall back to `window.open()` and log the fallback event
- [x] 4.5 Run `npm run build`, `npm test`, `npm run type-check`, `npm run lint`
- [x] 4.6 Commit, push, create OpenSpec archive
