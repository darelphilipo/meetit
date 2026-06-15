## Why

When a user taps any link inside the app (an event share link, a "View on Reddit" button, a future "💬 Join Discussion" deep link, or a Reddit compose URL), the app calls `navigateTo(url)` to push the user to a native Reddit page. The user reads the page, taps Back, and returns to the Meetit webview — but on iOS Safari and the iOS Reddit app, the webview is often left blank. The page chrome (header, tabs) is gone; only a white screen remains. The user has to force-quit the Reddit app and reopen the post to recover.

This is a known, documented platform bug. The skills reference calls it out: "Reddit app leaves webview blank after navigateTo on return" (Podcast Poster section). The fix is a `visibilitychange` listener that re-initializes the app when the user returns to the webview.

Right now this bug affects only the share-link button. Once `e13-direct-message-organizer` lands, every mod and attendee DM button will trigger the same code path. Fix it once, here, before more navigateTo buttons ship.

## Priority: 3/5

## Status: proposed

## What Changes

- Add a `visibilitychange` event listener in `app.ts` that detects when the user returns to the Meetit webview.
- When the page becomes visible again, re-run the app's `init()` (or equivalent) to re-fetch home data and re-render the current tab.
- Guard against double-fire: if the app is already initialized, do a soft re-render instead of a full re-init.
- Throttle: ignore visibility events that fire within 500ms of the previous one (avoids re-init loops on rapid focus/blur).
- Log `[FEATURE] visibilitychange fired state={visible|hidden} action={reinit|soft-render|skipped}` to the debug panel so we can see the fix in action on real devices.
- Add a manual test step: navigate to a Reddit URL via `navigateTo`, tap Back, verify the app re-renders without a manual refresh.

## Capabilities

### New Capabilities
- `ios-blank-after-navigate`: A `visibilitychange` listener in `app.ts` that re-initializes or re-renders the app when the user returns to the webview from a `navigateTo` call. Fixes the iOS Safari + iOS Reddit app blank-webview bug.

### Modified Capabilities
- None.

## Impact

- `src/client/app.ts`: add the `document.addEventListener("visibilitychange", onVisibility)` near the existing `bindButtons()` call. The handler is ~15 lines.
- `public/app.html`: no CSS changes.
- `LEARNINGS.md`: §45 added when this is implemented (iOS webview blank-after-navigateTo bug + `visibilitychange` fix; documents the Podcast Poster pattern from skills.md).

## Out of Scope

- Android-specific quirks (the bug is documented as iOS-primary; Android usually works fine).
- A retry-with-backoff for failed re-inits (v1 just does a single re-init on the first visibility event).
- A "Reconnecting..." overlay (the re-init should be fast enough that a loading state is not needed; if it isn't, that's a separate change).

## Decisions (to be made during design phase)

- **Throttle window:** 500ms. Long enough to coalesce double-fire events from iOS, short enough that a legitimate second navigateTo-return re-init still works.
- **Re-init vs soft-render:** prefer soft-render (re-fetch home + re-render current tab) to preserve in-flight state like open overlays. Full re-init only if soft-render fails or the user has been away > 5 minutes.
- **Idempotency:** the handler should be safe to call multiple times in a row. If a re-render is already in progress, skip the new one.
- **Detect the bug:** add a one-time test on app load: schedule a `setTimeout(() => log("blank-check: ready"), 100)`. If the log doesn't appear in the debug panel after navigating away and back, the fix is broken.

## Why this is Priority 3/5, not 2/5

The bug currently affects only the share-link button (rare, used by ~5% of users). It will become more visible once `e13-direct-message-organizer` ships and every mod/attendee gets a DM button. Fix it before e13 ships, not after. Pushing the priority to 3/5 reflects "fix before the next change that depends on it."
