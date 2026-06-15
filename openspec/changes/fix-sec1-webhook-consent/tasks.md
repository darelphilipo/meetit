## 1. Server: Consent Storage

- [ ] 1.1 In `onRsvp`, read `consented: boolean` from request body
- [ ] 1.2 If `consented === true`, `redis.set("meetit:rsvp_consent:{eventId}:{username}", "1")` (no TTL)
- [ ] 1.3 Wrap the webhook call in `if (consented)` block
- [ ] 1.4 Log `[FEATURE] rsvp-consent eventId={id} user={u} consented={bool}`

## 2. Client: Checkbox in RSVP Form

- [ ] 2.1 In RSVP step 1, add `<label><input type="checkbox" id="rsvp-consent" /> 📨 Share my contact info with the organizer</label>`
- [ ] 2.2 Add disclosure text: "Your contact info is sent to the event organizer via a third-party integration."
- [ ] 2.3 Default: unchecked
- [ ] 2.4 In `submitRsvp`, read checkbox state and include in body

## 3. Logging & Polish

- [ ] 3.1 Add `log()` calls at every changed path per §0.2
- [ ] 3.2 Update LEARNINGS.md
- [ ] 3.3 Run `npm run build`, `npm test`, `npm run type-check`
- [ ] 3.4 Commit, push, create OpenSpec archive

## 4. Tests

- [ ] 4.1 Test: `onRsvp` with `consented: false` does NOT call webhook
- [ ] 4.2 Test: `onRsvp` with `consented: true` calls webhook and stores consent key
- [ ] 4.3 Test: `onRsvp` with missing `consented` field defaults to false (privacy-first)
