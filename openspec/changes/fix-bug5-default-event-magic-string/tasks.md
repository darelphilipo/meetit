## 1. Update Filter

- [ ] 1.1 In `getAllApprovedEvents`, change `e.id !== "default-bangalore-tech-chai"` to `!e.id.startsWith("default-")`
- [ ] 1.2 Log `[FEATURE] default-event-filter prefix=default- skipped={n}`

## 2. Test

- [ ] 2.1 Manual test: default events no longer appear in mod dashboard
