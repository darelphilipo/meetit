## 1. Update CRON Logic

- [x] 1.1 In `onCheckEvents`, at start, check if `lastCheck === "0"` or missing
- [x] 1.2 If so, set `lastCheck = Date.now().toString()` and skip the alert loop
- [x] 1.3 Log `[CRON] first-run skipping-alerts`

## 2. Verify

- [x] 2.1 Confirm v1.3.3 already has this; this change just formalizes it
- [x] 2.2 If missing, add it
