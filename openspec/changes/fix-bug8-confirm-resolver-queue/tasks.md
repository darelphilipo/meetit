## 1. Refactor confirmDestructive

- [ ] 1.1 Replace global `confirmResolve` with `overlayEl._confirmResolve` per-instance
- [ ] 1.2 In overlay close handler (any close), call `_confirmResolve(false)` and delete
- [ ] 1.3 In confirm button click, call `_confirmResolve(true)` and delete
- [ ] 1.4 Log `log("confirm-resolved result={true|false} overlayId={id}")` on resolution

## 2. Test

- [ ] 2.1 Manual test: rapid-tap two delete buttons → both confirms resolve correctly
