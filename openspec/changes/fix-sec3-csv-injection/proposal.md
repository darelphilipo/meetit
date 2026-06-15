## Why

The `/api/export-attendees` endpoint builds CSV with simple string concatenation. If a username or email contains a comma, quote, or newline, the CSV breaks. Worse: if a username starts with `=`, `+`, `-`, or `@`, Excel interprets it as a formula and may execute arbitrary code (CSV injection attack).

## Priority: 3/5

## Status: proposed

## What Changes

- Add a `csvEscape(value: string): string` helper that:
  - Wraps the value in double quotes
  - Escapes any internal double quotes by doubling them
  - If the value starts with `=`, `+`, `-`, `@`, or a tab character, prepend a single quote (Excel formula escape)
- Replace all string concatenation in `onExportAttendees` with `csvEscape()`.
- Add logging at the changed path per §0.2.

## Capabilities

### New Capabilities
- `csv-safety`: Safe CSV export with proper escaping and formula injection prevention.

### Modified Capabilities
- None.

## Impact

- `src/server/server.ts`: new `csvEscape()` helper. Update `onExportAttendees` to use it.
- `src/shared/meetit.ts`: export `csvEscape` so it can be unit tested.

## Reference

- OWASP CSV Injection: https://owasp.org/www-community/attacks/CSV_Injection
- RFC 4180: https://www.ietf.org/rfc/rfc4180.txt
