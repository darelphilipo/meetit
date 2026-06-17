## 1. Helper

- [x] 1.1 Add `csvEscape(value: string): string` to `src/shared/meetit.ts`:
  ```ts
  function csvEscape(value: string): string {
    var s = String(value);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  ```
  (Implemented as `csvEscape(value: string | null | undefined): string` to handle `null`/`undefined` fields; the inner `String(value)` is then defensive.)
- [x] 1.2 Export from module

## 2. Wire into Export

- [x] 2.1 In `onExportAttendees`, replace all `username + "," + email` patterns with `csvEscape(username) + "," + csvEscape(email)`
- [x] 2.2 Apply to: username, email, phone. (RSVP date not in the export — only `Username,Email,Phone` header per the original endpoint contract.)
- [x] 2.3 Log: existing `[EXPORT] ${eventId} | ${attendees.length} attendees | by ${context.username}` is the per-request log; per-field escape decisions are not logged to avoid leaking user data into server logs.

## 3. Logging & Polish

- [x] 3.1 Add `log()` calls at every changed path per §0.2 — the per-request `[EXPORT]` log remains
- [x] 3.2 Update LEARNINGS.md with CSV escape pattern — §48 added
- [x] 3.3 Run `npm run build`, `npm test`, `npm run type-check` — all OK
- [x] 3.4 Commit, push, create OpenSpec archive

## 4. Tests

- [x] 4.1 Test: `csvEscape("hello")` returns `"hello"` (covered by `csvEscape wraps plain strings in double quotes`)
- [x] 4.2 Test: `csvEscape('he"llo')` returns `"he""llo"` (covered by `csvEscape handles commas, quotes, and newlines per RFC 4180`)
- [x] 4.3 Test: `csvEscape("=SUM(A1:A2)")` returns `"'=SUM(A1:A2)"` (covered by `csvEscape prevents formula injection for dangerous leading characters`)
- [x] 4.4 Test: `csvEscape("+danger")` returns `"'+danger"` (covered by `csvEscape prevents formula injection for dangerous leading characters`)
- [x] 4.5 Test: `csvEscape("normal,comma")` returns `"normal,comma"` (covered by `csvEscape handles commas, quotes, and newlines per RFC 4180`)

Plus: `csvEscape returns empty quoted string for null and undefined` (defensive).
