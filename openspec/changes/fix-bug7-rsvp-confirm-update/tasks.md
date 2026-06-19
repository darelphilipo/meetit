## 1. Pre-fill Contact Info

- [x] 1.1 On RSVP form open, if user is already RSVP'd, fetch their stored contact info from `/api/my-rsvp?eventId={id}` (`app.ts:1729`: `showUpdateRsvpOverlay`)
- [x] 1.2 Pre-fill email and phone fields (`app.ts:1728`: `showRsvpOverlay(id, email, phone)`)
- [ ] 1.3 Show "✏️ You're updating your RSVP" banner inside the overlay body

## 2. New Endpoint

- [x] 2.1 `/api/my-rsvp` exists and returns `{ email, phone }` for the current user + event
- [ ] 2.2 (Optional) Extend `/api/init` to include the user's RSVP'd events + contact info

## 3. Confirmation Toast

- [x] 3.1 On re-RSVP success, show toast (`showToast(isUpdate ? "Contact info updated ✅" : "RSVP confirmed! 🎉", "success")` at `app.ts:1794`)
- [ ] 3.2 Log `log("rsvp-updated eventId={id} user={u}")`

## 4. Test

- [ ] 4.1 Manual test: RSVP, then re-RSVP with new email → see pre-fill + toast
