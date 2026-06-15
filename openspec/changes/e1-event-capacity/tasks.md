## 1. Server: Event Model

- [ ] 1.1 Add `maxAttendees?: number` to `Event` type in `src/shared/api.ts`
- [ ] 1.2 Add `maxAttendees?: number` to `CreateEventFormData`
- [ ] 1.3 Persist `maxAttendees` in event hash on submit
- [ ] 1.4 Include `maxAttendees` in `onHome` and `onEventDetails` responses

## 2. Server: RSVP Gate

- [ ] 2.1 Add `getEventCapacity(eventId)` helper returning `{ filled: number, max: number | null }`
- [ ] 2.2 In `onRsvp`, after `getActiveEvent` check, call `getEventCapacity`. If `max !== null && filled >= max`, return `{ success: false, error: "Event full" }` (HTTP 409)
- [ ] 2.3 Log `[FEATURE] capacity-check eventId={id} filled={n} max={m} result={allowed|full}`

## 3. Client: Home Card UI

- [ ] 3.1 In `renderHomeCard`, when `e.maxAttendees`, render capacity badge: "🎟️ {n}/{max} going" with color class
- [ ] 3.2 Color thresholds: gray <50%, yellow 50-89%, red 90%+
- [ ] 3.3 When `filled >= max`, show "🚫 Full" banner and disable RSVP button

## 4. Client: Event Details UI

- [ ] 4.1 In `openDetailsOverlay` step 1, add capacity progress bar below the metadata row
- [ ] 4.2 Progress bar: `width: (filled/max)*100%` with the same color thresholds
- [ ] 4.3 When full, RSVP button text becomes "🚫 Event Full" and is disabled

## 5. Client: Create/Edit Form

- [ ] 5.1 Add "Max attendees (optional)" number input in step 2 of create form
- [ ] 5.2 Default empty = unlimited
- [ ] 5.3 Validate > 0 on client; server re-validates

## 6. Logging & Polish

- [ ] 6.1 Add `log()` calls at every changed path per §0.2
- [ ] 6.2 Update LEARNINGS.md with capacity decision
- [ ] 6.3 Run `npm run build`, `npm test`, `npm run type-check`
- [ ] 6.4 Commit, push, create OpenSpec archive

## 7. Tests

- [ ] 7.1 Add test: `getEventCapacity()` returns `{ filled, max: null }` for unlimited events
- [ ] 7.2 Add test: `getEventCapacity()` returns `{ filled, max: number }` for capped events
- [ ] 7.3 Add test: RSVP returns `Event full` error when filled >= max
