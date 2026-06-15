## 1. Server: API + Handler

- [ ] 1.1 Add `EDIT_EVENT` endpoint constant in `src/shared/api.ts`
- [ ] 1.2 Add `EditEventFormData` type
- [ ] 1.3 Implement `onEditEvent` handler in `src/server/server.ts`:
  - Auth required, `eventId` from body
  - Load event via `getEventById(eventId)` (from `pending` and `approved` Redis namespaces)
  - Authorize: `isSubmissionOwner` OR `requireMod`
  - `hSet` updated fields into the existing event hash
  - If was `published` and editor is mod, move to `pending` for re-review
  - Log `[FEATURE] edit-event id={id} editor={username} wasPublished={bool}`
- [ ] 1.4 Return `{ success: true, event: updated }`

## 2. Client: Form Pre-fill

- [ ] 2.1 New `prefillEventForm(event)` function that populates all 4 steps from an existing event
- [ ] 2.2 In `openCreateEventOverlay`, add a new mode param: `'create' | 'edit'`
- [ ] 2.3 Show "✏️ Editing event" banner at top of form when mode is `edit`
- [ ] 2.4 Change submit button text to "Save Changes" when mode is `edit`
- [ ] 2.5 `submitEvent()` calls `/api/edit-event` when mode is `edit`

## 3. Client: Trigger Buttons

- [ ] 3.1 Add "✏️ Edit" button to My Stuff → Events tab (only visible to event owner)
- [ ] 3.2 Add "✏️ Edit" button to Mod Dashboard → Published tab
- [ ] 3.3 Add `data-action="edit-event"` and `data-id={eventId}` to both
- [ ] 3.4 Wire `case "edit-event"` in `handleAction()` → `openCreateEventOverlay('edit', id)`

## 4. Logging & Polish

- [ ] 4.1 Add `log()` calls at every changed path per §0.2
- [ ] 4.2 Update LEARNINGS.md with edit-flow notes
- [ ] 4.3 Run `npm run build`, `npm test`, `npm run type-check`
- [ ] 4.4 Commit, push, create OpenSpec archive

## 5. Tests

- [ ] 5.1 Test: `onEditEvent` rejects unauthenticated users
- [ ] 5.2 Test: `onEditEvent` rejects non-owner non-mod users
- [ ] 5.3 Test: `onEditEvent` updates fields in place (same `id`, RSVP set preserved)
