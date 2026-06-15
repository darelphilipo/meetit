## 1. Refactor onApproveEvent

- [ ] 1.1 Wrap `hSet` + `hDel` in try/finally
- [ ] 1.2 Add `redis.del(lockKey)` in finally (with inner try/catch for the del itself)
- [ ] 1.3 Add `[APPROVE] lock-released id={id}` log on success
- [ ] 1.4 Add `[APPROVE] lock-release-failed id={id} err={e}` log on inner-catch
- [ ] 1.5 Keep 10s TTL on lock as backup safety net

## 2. Test Manual Scenarios

- [ ] 2.1 Happy path: mod approves event → active_events has it, pending_events doesn't, lock released
- [ ] 2.2 Inject failure: stub `hSet` to throw → lock still released, error returned to client
- [ ] 2.3 Race: rapid double-approve → second request gets 409 "already being approved"

## 3. Logging & Polish

- [ ] 3.1 Verify all logs surface in devvit-cli logs
- [ ] 3.2 Update LEARNINGS.md if there's a new lesson (lock-cleanup pattern)
- [ ] 3.3 Run `npm run build`, `npm test`, `npm run type-check`
- [ ] 3.4 Commit, push, `openspec archive fix-approve-lock-cleanup`
