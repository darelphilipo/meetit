## 1. Pre-fill Contact Info

- [ ] 1.1 On RSVP form open, if user is already RSVP'd, fetch their stored contact info from `/api/my-rsvp?eventId={id}`
- [ ] 1.2 Pre-fill email and phone fields
- [ ] 1.3 Show "✏️ You're updating your RSVP" banner

## 2. New Endpoint

- [ ] 2.1 Add `/api/my-rsvp` that returns `{ email, phone }` for the current user + event
- [ ] 2.2 Or extend `/api/init` to include the user's RSVP'd events + contact info

## 3. Confirmation Toast

- [ ] 3.1 On re-RSVP success, show "✏️ RSVP updated — new contact info saved" toast
- [ ] 3.2 Log `log("rsvp-updated eventId={id} user={u}")`

## 4. Test

- [ ] 4.1 Manual test: RSVP, then re-RSVP with new email → see pre-fill + toast
