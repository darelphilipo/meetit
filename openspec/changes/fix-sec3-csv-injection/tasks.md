## 1. Helper

- [ ] 1.1 Add `csvEscape(value: string): string` to `src/shared/meetit.ts`:
  ```ts
  function csvEscape(value: string): string {
    var s = String(value);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  ```
- [ ] 1.2 Export from module

## 2. Wire into Export

- [ ] 2.1 In `onExportAttendees`, replace all `username + "," + email` patterns with `csvEscape(username) + "," + csvEscape(email)`
- [ ] 2.2 Apply to: username, email, phone, RSVP date
- [ ] 2.3 Log `[FEATURE] csv-export eventId={id} rows={n} escaped={n}`

## 3. Logging & Polish

- [ ] 3.1 Add `log()` calls at every changed path per §0.2
- [ ] 3.2 Update LEARNINGS.md with CSV escape pattern
- [ ] 3.3 Run `npm run build`, `npm test`, `npm run type-check`
- [ ] 3.4 Commit, push, create OpenSpec archive

## 4. Tests

- [ ] 4.1 Test: `csvEscape("hello")` returns `"hello"`
- [ ] 4.2 Test: `csvEscape('he"llo')` returns `"he""llo"`
- [ ] 4.3 Test: `csvEscape("=SUM(A1:A2)")` returns `"'=SUM(A1:A2)"`
- [ ] 4.4 Test: `csvEscape("+danger")` returns `"'+danger"`
- [ ] 4.5 Test: `csvEscape("normal,comma")` returns `"normal,comma"`
