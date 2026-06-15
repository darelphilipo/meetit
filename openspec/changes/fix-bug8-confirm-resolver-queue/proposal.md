## Why

`confirmDestructive` uses a global `confirmResolve` variable. If two confirms are triggered simultaneously (e.g., rapid taps on two different delete buttons), the first confirm's resolve is overwritten by the second. The first confirm's button stays locked forever.

## Priority: 2/5

## Status: proposed

## What Changes

- Replace the global `confirmResolve` with a per-instance resolver stored on the overlay element.
- Each `confirmDestructive()` call creates a unique resolver, stored as `overlayEl._confirmResolve`.
- When the overlay is closed (any way), the resolver is called with `false` (deny) and cleared.
- When the user clicks "Confirm", the resolver is called with `true` and cleared.

## Capabilities

### New Capabilities
- `confirm-resolver-queue`: Per-instance confirm resolver to prevent overwrite on rapid concurrent confirms.

### Modified Capabilities
- None.

## Impact

- `src/client/app.ts`: refactor `confirmDestructive` to use per-instance resolvers.

## Why Low Priority

The scenario requires a very specific rapid-tap pattern. Not observed in production yet.
