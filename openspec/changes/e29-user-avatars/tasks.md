# e29-user-avatars — Tasks

## Phase 1: CSP Test (binary go/no-go)

- [ ] 1. Add temporary `/api/avatar-test` endpoint that returns a snoovatar URL for a test user
- [ ] 2. Try to display the URL in an `<img>` tag in the webview — if image loads → proceed, if blocked → feature requires proxy layer (significantly more complex)

## Phase 2: If CSP Test Passes

- [ ] 3. Add server-side avatar cache: `/api/avatar/{username}` endpoint with 24h Redis TTL
- [ ] 4. Batch-fetch avatars on server side for home card / attendee lists
- [ ] 5. Update `.avatar-circle` CSS to support `<img>` with fallback to initial letter
- [ ] 6. Add `navigateTo(user.url)` on avatar click
- [ ] 7. Update organizer display (event details, mod dashboard)
- [ ] 8. Update attendee lists (share posts, reminder posts)
- [ ] 9. Add unit tests for avatar cache logic
- [ ] 10. Deploy and verify on iOS Safari
