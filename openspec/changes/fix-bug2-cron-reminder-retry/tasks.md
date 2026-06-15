## 1. Update CRON Logic

- [ ] 1.1 In `onCheckEvents`, change reminder condition to allow 0–1h after start
- [ ] 1.2 Wrap modmail call in try/catch; only set `remindedKey` on success
- [ ] 1.3 Log retry attempts separately from first attempts

## 2. Test

- [ ] 2.1 Manual test: simulate missed reminder, verify retry on next CRON
- [ ] 2.2 Test: failed modmail doesn't set remindedKey
