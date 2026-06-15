## 1. Server: API Extension

- [ ] 1.1 Extend event type in `src/shared/api.ts` with `attendeePreview?: string[]` and ensure `rsvpCount` is present
- [ ] 1.2 In `onHome`, after fetching events, batch-query first 3 attendees per event with `Promise.all([zRange(key, 0, 2)])`)
- [ ] 1.3 Log `[FEATURE] home attendee-preview fetched for {n} events in {ms}ms`

## 2. Client: Avatar Row Rendering

- [ ] 2.1 In `renderHomeCard`, add `<div class="attendee-preview">{avatars}</div>` after metadata row
- [ ] 2.2 Helper `renderAttendeeAvatars(usernames: string[])`:
  - 3 colored circles with first letter of username (uppercase, strip `u/` prefix)
  - If `usernames.length > 3`, append `<span class="attendee-more">+{N-3}</span>`
  - If `usernames.length === 0`, return empty string (hide row)
- [ ] 2.3 Add `data-username` on each avatar for future profile-link feature

## 3. Styling

- [ ] 3.1 Add `.attendee-preview` styles: `display: flex; gap: 4px; align-items: center; margin-top: 6px`
- [ ] 3.2 Add `.attendee-avatar` styles: 24px circle, border, font-weight 700, color #fff, background = hashed color
- [ ] 3.3 Add `.attendee-more` styles: small text, same height as avatar
- [ ] 3.4 Make sure avatar row fits in 1 row of the card (use `flex-shrink: 0` on the row)

## 4. Edge Cases

- [ ] 4.1 Empty preview → row hidden entirely
- [ ] 4.2 Single attendee → show 1 avatar
- [ ] 4.3 Long username → truncate to 1 char (the letter is what matters)
- [ ] 4.4 Username with `u/` prefix → strip and use letter after slash

## 5. Logging & Polish

- [ ] 5.1 Add `log()` calls at every changed path per §0.2
- [ ] 5.2 Update LEARNINGS.md with avatar hashing strategy
- [ ] 5.3 Run `npm run build`, `npm test`, `npm run type-check`
- [ ] 5.4 Commit, push, create OpenSpec archive

## 6. Tests

- [ ] 6.1 Test: `renderAttendeeAvatars([])` returns `""`
- [ ] 6.2 Test: `renderAttendeeAvatars(["alice", "bob"])` returns 2 avatars
- [ ] 6.3 Test: `renderAttendeeAvatars(["a","b","c","d","e"])` returns 3 avatars + "+2"
