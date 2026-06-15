## 1. Shared: add the formatter

- [ ] 1.1 In `src/shared/meetit.ts`, add `export function formatRelativeTime(ms: number): string`
- [ ] 1.2 Buckets: `ms < 60_000` → "just now"; `ms < 3_600_000` → "Nm ago"; `ms < 86_400_000` → "Nh ago"; `ms < 604_800_000` → "Nd ago"; `ms < 2_592_000_000` → "Nw ago"; else `new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" })`
- [ ] 1.3 Guard against negative `ms` (clock skew): if `ms < 0`, return "just now"
- [ ] 1.4 Guard against `Infinity` / `NaN`: if `!isFinite(ms)`, return "—"

## 2. Client: use the formatter in My Stuff cards

### 2.1 My Events
- [ ] 2.1.1 In `renderMyEventCard()`, compute `var ageMs = Date.now() - new Date(event.submittedAt || event.createdAt).getTime();`
- [ ] 2.1.2 For `status === "pending"`: render `<div class="status-timeline">📅 Submitted {formatRelativeTime(ageMs)} · Usually reviewed within 48hrs</div>`
- [ ] 2.1.3 For `status === "published"`: render `<div class="status-timeline">📈 {event.rsvpCount||0} RSVPs · approved {formatRelativeTime(ageMs)}</div>`
- [ ] 2.1.4 For `status === "rejected"`: render `<div class="status-timeline">❌ Rejected {formatRelativeTime(ageMs)}</div>`

### 2.2 My Pitches
- [ ] 2.2.1 In `renderMyPitchCard()`, do the same with `pitch.submittedAt`
- [ ] 2.2.2 For `status === "pending"`: same line as events
- [ ] 2.2.3 For `status === "approved"`: "📈 Promoted to {count} event(s) · approved {label}"
- [ ] 2.2.4 For `status === "rejected"`: same as events

## 3. CSS: add the style

- [ ] 3.1 In `public/app.html`, add `.status-timeline { font-size: 11px; color: #666; margin-top: 4px; }`
- [ ] 3.2 Optional: `.status-timeline.pending { color: #b8860b; }` for the pending hint (warm yellow), `.status-timeline.rejected { color: #c0392b; }` (red) — only if the design needs the visual weight; the emoji already conveys the status

## 4. Logging & Polish

- [ ] 4.1 Add `log()` call on first render of each card: `log("status-timeline id=" + id + " status=" + status + " ageLabel=" + label)`
- [ ] 4.2 Manual test: submit a pitch, view My Pitches, verify "Submitted just now" → wait 1 minute → verify "1m ago" (or hardcode the timestamp in the test fixture)
- [ ] 4.3 Verify the formatter handles edge cases: missing `submittedAt` (fallback to `createdAt`), `submittedAt` in the future (clock skew, returns "just now"), `submittedAt` > 30 days ago (returns absolute date)
- [ ] 4.4 Run `npm run build`, `npm test`, `npm run type-check`, `npm run lint`
- [ ] 4.5 Commit, push, create OpenSpec archive
