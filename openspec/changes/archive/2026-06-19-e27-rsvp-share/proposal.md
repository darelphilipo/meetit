## Why

After RSVP success, users see a confirmation card with event details. Currently the only post-RSVP action is "Copy Details" — useful for pasting into a DM, but the user has to manually craft the social-share text. **There's no easy way for a user to publicly declare "I'm going to X" on the subreddit.** This is a missed social signal that drives both attendance (FOMO on visible RSVPs) and engagement (comment threads on the share post).

This change adds a **"🎉 Share that I'm going"** button to the RSVP success card. Tapping it opens a draft-preview overlay showing the exact post that will be created. The user reviews the draft, taps "Post to Reddit →", and a new post is created in the subreddit under **the user's own account** (with graceful fallback to the Meetit app account if `runAs: 'USER'` is not yet approved for the app).

**Why this matters:** "u/alice is going to Bangalore Tech Chai" reads differently from "Posted by u/Meetit-app: alice is going to Bangalore Tech Chai". The user-account post is authentic social proof and drives organic engagement.

## Priority: 3/5

## Status: proposed

## What Changes

### 1. New "Share that I'm going" button on the RSVP success card

Today the RSVP success card has two buttons (`📋 Copy Details`, `Done →`). This change adds a third button: **`🎉 Share that I'm going`** (pink, primary). Same overlay, no new tab or flow.

### 2. New draft-preview overlay

Tapping the share button opens a small mini-overlay showing the **exact** post title and body that will be created — read-only. Two buttons: `Post to Reddit →` (pink, primary) and `Cancel` (white, secondary).

The preview serves two purposes:
- **UX:** the user sees what they're sharing before it goes out
- **User Actions compliance:** per the [Devvit User Actions docs](https://developers.reddit.com/docs/capabilities/server/userActions), the user must always be informed before the app acts on their behalf. The preview is the "ask permission" step. No separate consent checkbox needed.

### 3. New server endpoint `/api/rsvp-share`

Body: `{ eventId: string }`. Logic:
- Read `eventId` from body
- Look up the event (404 if not found)
- Get `context.username` (401 if not logged in)
- **Dedup check:** `redis.get("meetit:rsvp_share:" + eventId + ":" + username)`. If present, return `{ type: "rsvp-share", success: false, reason: "already_shared" }`.
- Build the post body using new pure helper `buildRsvpShareBody(event, username, subredditName)`
- **Try `runAs: 'USER'` first:** `reddit.submitPost({ title, text, runAs: 'USER', userGeneratedContent: { text: title + "\n\n" + body } })`
- If `runAs: 'USER'` throws, **fall back to `runAs: 'APP'`** with a non-blocking log
- **Set dedup key** (24h TTL) regardless of `postedAs`
- Return `{ type: "rsvp-share", success: true, postUrl, postedAs: "USER" | "APP" }`

### 4. New `buildRsvpShareBody()` pure function

In `src/shared/meetit.ts`. Mirrors the design of `buildReminderBody` — pure, testable, no Devvit imports.

**Post format:**
- **Title:** `u/${username} is going to ${event.title} (${event.date})`
- **Body:**
  ```
  📅 ${event.date} at ${event.time}
  📍 ${event.location}
  🗺️ [Open in Google Maps](${event.mapUrl})  *(omitted if no mapUrl)*
  
  ${event.description}  *(truncated to 300 chars with "…" if longer; omitted if empty)*
  
  ---
  
  Posted via [Meetit](https://www.reddit.com/r/${subredditName}).
  ```

The body is intentionally short and scannable. Social-share posts that look like essays don't get engagement.

### 5. `devvit.json` permission update

Add `"asUser": ["SUBMIT_POST"]` under `permissions.reddit`. This is the **only** config change. The platform requires this for `runAs: 'USER'` calls. **Note:** per the [User Actions docs](https://developers.reddit.com/docs/capabilities/server/userActions), this **"extends review time"** for the app. The graceful fallback to `runAs: 'APP'` means the feature works from day 1 even if the app is still pending Reddit's user-actions review.

### 6. 24h Redis dedup per (eventId, username)

When the server successfully creates a share post, it sets `meetit:rsvp_share:${eventId}:${username}` with 24h TTL. Subsequent calls within 24h return `{ success: false, reason: "already_shared" }` and the client shows a toast "You already shared this event today". This prevents accidental double-posts from impatient clicking.

## Capabilities

### New Capabilities
- `rsvp-share`: Spec for the social-share feature. Covers the button, preview overlay, server endpoint, and dedup behavior.

### Modified Capabilities
- None.

## Impact

- `devvit.json`: add `"asUser": ["SUBMIT_POST"]` to `permissions.reddit`. **This is the only config change.**
- `src/shared/api.ts`: add `ApiEndpoint.RsvpShare = "/api/rsvp-share"`.
- `src/shared/meetit.ts`: new pure `buildRsvpShareBody()` function (~50 lines).
- `src/server/server.ts`: 
  - New `onRsvpShare()` handler (~50 lines).
  - New route case in the switch statement.
  - New `checkRsvpShareDedup()` / `markRsvpSharePosted()` Redis helpers.
  - New response type: `{ type: "rsvp-share"; success: boolean; postUrl?: string; postedAs?: "USER" | "APP"; reason?: "already_shared" }`.
- `public/app.html`: new share-preview overlay markup (~15 lines, similar to existing `confirm-overlay`).
- `src/client/app.ts`: 
  - Add 3rd button to RSVP success card (~3 lines).
  - New `data-action="share-rsvp"` handler that opens the preview overlay.
  - New `data-action="confirm-rsvp-share"` handler that POSTs to the server and navigates to the new post.
  - Close-overlay handler for the preview overlay.
- `tools/meetit-behavior.test.ts`: 5 new test cases for `buildRsvpShareBody()`.

## Why this priority

This is a **social engagement** feature — the kind of small UX addition that doesn't unlock new functionality but materially increases organic activity in the subreddit. The expected impact is more "I'm going" posts → more comment threads → higher attendance.

Not higher priority because:
- The current RSVP flow works; this is purely additive.
- No data model changes; just a new endpoint.
- `runAs: 'USER'` review delay is the main risk, mitigated by the APP fallback.

Not lower priority because:
- The share button is a natural next step after RSVP — users will want to share.
- Without it, users can only do `📋 Copy Details` and paste manually into a self-post, which is friction.

## Why a draft preview (not a single button)

A single "Share → post immediately" button would have:
- **No protection against typos** — user can't review the post before it goes out.
- **No compliance with User Actions "always ask permission" rule** — the post is created in one click.
- **No opt-in confirmation** — accidental clicks = accidental public posts under the user's name.

The draft preview adds one extra tap but solves all three. It's the same pattern used by Strava, Letterboxd, Spotify Wrapped, and most other social-share UIs.

## Compliance with User Actions rules

Per [Devvit User Actions docs](https://developers.reddit.com/docs/capabilities/server/userActions):
- ✅ **Always ask permission** — draft preview is the explicit consent step.
- ✅ **No automated actions** — single button click is user-initiated.
- ✅ **Establish a reporting flow** — the post is editable/deletable on Reddit itself.
- ✅ **Do not gate any functionality** — Share is optional, RSVP succeeds without it.
- ✅ **Keep actions separate** — the Share button is distinct from the RSVP confirm.

## Out of Scope

- **Auto-share on RSVP** (no user action) — would violate User Actions "no automated actions" rule.
- **Editable share text** before posting — deferred to a follow-up if users ask for it.
- **Share cancellation post** ("Actually I can't make it") — different feature; can reuse the share infrastructure later.
- **Cross-posting to user's profile** — out of scope.
- **Share analytics** (X users shared Y events) — out of scope.
- **Image in share post** (e.g., event emoji as share image) — out of scope; would require media upload flow.
- **Pre-approval gate** (e.g., mods must approve before share posts are visible) — out of scope; the user account posting is itself the consent step.

---

## Post-launch hotfix (2026-06-19)

After the first deploy, the user reported: *"didn't see any share button post rsvp"*.

### Root cause

The RSVP success card was using a `flex-direction: column; justify-content: flex-start;` layout with the new Share button at the **bottom** of the column. On the dev subreddit's iframe (Devvit Web inline view, default height 320px in some clients), the content height exceeded the visible area, and the **bottom row containing the Share button was below the fold**.

Concretely, the original layout was:
- 32px top padding + 56px SVG checkmark + 18px heading + 14px event title + 13px date + 13px location + 44px Share button + 44px Copy/Done row = **~328px** of content stacked top-to-bottom.

### Fix

Restructured the success card with a **pinned bottom action row**:

- Scrollable header content (checkmark + title + date + location) in a `flex: 1 1 auto; overflow-y: auto; min-height: 0` container — scrolls when it doesn't fit.
- **Pinned button row** with `flex-shrink: 0; border-top: var(--border); background: #fff` — always visible at the bottom regardless of viewport height.
- Reduced vertical sizes (checkmark 56→40px, heading 18→15px, gaps 10→8px) for a more compact layout.
- Added `margin-top: 0` to button classes to prevent the default `.btn` margin from pushing the row down.
- Used `text-overflow: ellipsis` on the location line so long venue names don't wrap and push the button row off-screen.

Total content height after fix: ~220px (header) + 60px (button row) + 12px padding = **~292px**, which fits in the standard 320px iframe height with room to spare.

### Why this is a hotfix, not a new OpenSpec change

The fix is purely a CSS layout adjustment (~20 lines of inline style changes in `app.ts`). The Share button logic, server endpoint, and dedup behavior are unchanged. The Share button was rendering correctly — it was just below the visible viewport.

Per `LEARNINGS.md` §40: "surgical changes only — no refactoring beyond change scope". A 20-line layout fix doesn't justify a new OpenSpec change. The fix is recorded here for future maintainers.

### Verification

- `npm test`: 41/41 pass (unchanged — no new tests needed for a CSS-only layout fix)
- `npm run type-check`: 0 new errors
- `npm run build`: success
- Visual verification (deferred to user): the Share button should now be **always visible** at the bottom of the success card on any viewport height

---

## Post-launch hotfix #2 (2026-06-19) — My Stuff entry point

After the pinned-row hotfix, the user reported again: *"still didn't see the share button"*.

### Why the success card hotfix didn't work

The success card layout fix was correct on paper, but the user still couldn't see the button in production. The most likely cause: **the iOS Safari iframe in Devvit Web clips the bottom of the viewport** due to the system home-indicator gesture area. The `.overlay-footer` (which is hidden but still in the layout via `flex-shrink: 0`) and the bottom safe-area inset together eat ~80-100px at the bottom of a 320px iframe. The success card's pinned row is at the bottom of the **detail-body** (the flex middle region), not the bottom of the **viewport** — so it ends up in the clipped zone.

This is an iOS Safari + Devvit Web iframe specific issue that the layout fix couldn't address without a much larger overhaul (e.g., measuring the actual visible area, using `100dvh` instead of `100vh`, or hiding the overlay-footer entirely during the success state).

### Fix: add a dedicated Share button in My Stuff → RSVPs

Instead of trying to make the success card button visible on every device, **add a second, more reliable entry point**: a Share button in the My Stuff → RSVPs card. The My Stuff card lives in a different container (`.card-shell` inside the My Stuff overlay) with its own layout model and a fixed actions area at the bottom of the card. The card is always scrollable and the actions area is **inside the card itself** (not in a flex middle region), so it's reliably visible.

#### What changed

- **`src/client/app.ts` — `renderMyRsvpCard()`** (lines 623-626 → 629-634): added a full-width pink Share button **above** the existing Update + Leave row.
- **`src/client/app.ts` — `openRsvpSharePreview()`** (line 2347): added a fallback to look in `myRsvps` if the event is not in `cachedHomeEvents`. This makes the share feature work from My Stuff even if the home cache is stale (e.g., user opened My Stuff from a deep link without first loading Home).

#### Why the success card button is kept (not removed)

The success card button is **still useful** for users who want to share right after RSVPing (the "in-the-moment" use case). The My Stuff button is the **secondary entry point** for users who didn't share immediately and come back to it later (the "I'll share later" use case). Keeping both:
- Doesn't break the existing in-the-moment flow
- Adds a reliable, always-visible entry point
- Costs ~1kb of bundle size
- Requires no new server endpoint (same `share-rsvp` handler, same `openRsvpSharePreview` function)

#### Layout decision: 2 rows, not 3 columns

The My Stuff card actions area is ~340px wide. With 3 buttons in a row, each would be ~110px wide — too narrow for "Update", "Share", "Leave" labels to be readable. With 2 rows:
- **Row 1 (primary, pink)**: 🎉 Share that I'm going (full-width, 44px tall)
- **Row 2 (secondary, white)**: ✏️ Update + ❌ Leave (side-by-side, 44px tall)

This matches the success card's pattern (primary action on top, management actions below) and gives each button enough room. It also makes the Share action visually prominent — the first thing the user sees at the bottom of the card.

#### Verification

- `npm test`: 41/41 pass
- `npm run type-check`: 0 new errors (10 pre-existing in unrelated lines)
- `npm run build`: success
- Bundle: `public/app.js:608` shows the new My Stuff button HTML
- Bundle: `public/app.js:2582` shows the new `myRsvps` fallback in `openRsvpSharePreview`
- Visual verification (deferred to user): the Share button should be **always visible at the bottom of each My Stuff RSVP card**

### The lesson (also added to LEARNINGS §53)

**Don't rely on a single entry point for important features.** A success card button is a moment-in-time affordance; a persistent menu (My Stuff) is a recoverable affordance. Ship both when the cost is small.

Also: **measure the actual visible area before designing layouts that depend on viewport size.** The iOS Safari iframe's "100%" is not the same as the user's "100%". When in doubt, put the action where the user can scroll to it, not where it depends on the viewport being exactly the right size.

---

## Post-launch hotfix #3 (2026-06-19) — Remove success card Share button

After the My Stuff button shipped, the user confirmed: *"the share from my stuff worked, but the one on rsvp doesn't. makes sense to remove the rsvp popup"*.

### Decision: remove the success card Share button

The success card Share button is removed entirely. The My Stuff Share button is now the **only** way to invoke the share flow. This is a deliberate simplification:

- **The success card is a 5-second window** that disappears when the user taps Done. If they don't notice the button in that window, they had to come back later — which is what My Stuff is for.
- **The pinned-bottom layout was complex** (nested scrollable header + flex-shrink: 0 button row) to support 3 buttons. With only 2 buttons (Copy + Done), the layout is much simpler: single column with `margin-top: auto` on the button row.
- **Two entry points is enough.** Now there's the moment-in-time (RSVP submission flow) and the persistent menu (My Stuff). The persistent menu is reliable, the moment-in-time was unreliable. The reliable one wins.

### What changed

- **`src/client/app.ts:2050-2083`**: replaced the complex nested-scroll layout (pinned-bottom row + 3 buttons) with a simple single-column layout (no nested scroll, 2 buttons only).
  - Removed: pink Share button, nested scrollable header, pinned bottom row, `flex-shrink: 0`, `border-top`, `background: #fff` on the button row
  - Kept: checkmark, title, date, location, Copy button, Done button
  - Simplified: `margin-top: auto` on the button row pushes it to the bottom naturally
  - Slightly larger checkmark (40→48px) and heading (15→17px) since there's no share button competing for attention

### What is NOT changed

- **`share-rsvp` data-action handler** (line 2581) — still needed for the My Stuff button
- **`openRsvpSharePreview()`** (line 2345) — still used by My Stuff, with the `myRsvps` fallback from hotfix #2
- **`confirmRsvpShare()`** (line 2611) — still used by My Stuff
- **`#rsvp-share-overlay`** in `app.html` — still needed for the preview
- **Server endpoint `onRsvpShare()`** — still used by My Stuff

### Why the success card layout is now simpler (not pinned-bottom)

The pinned-bottom pattern (LEARNINGS §52) is still correct for **multi-action confirmations in constrained viewports** (3+ buttons, or buttons that compete for space). But Copy + Done are small (44px total row height), so the simpler single-column layout with `margin-top: auto` works fine — the content is short enough to fit even in a 320px viewport.

### Verification

- `npm test`: 41/41 pass
- `npm run type-check`: 0 new errors (10 pre-existing in unrelated lines 443-987, 2231-2236)
- `npm run build`: success
- Bundle: only **one** `data-action="share-rsvp"` occurrence (the My Stuff button at `app.js:608`). The success card share button is gone.
- Visual: success card is now a clean single-column confirmation with Copy + Done at the bottom

### The deeper lesson (also added to LEARNINGS §54)

**Don't fight the platform. Move the action.** When a layout fix requires working around a platform-specific bug (iOS Safari iframe viewport clipping), consider whether the right answer is to **remove the action from the constrained surface** rather than to keep trying to make it fit. The user explicitly chose to remove the unreliable entry point. The My Stuff card has no such constraint.

**Prune features that don't earn their complexity.** The pinned-bottom action row added ~15 lines of layout code to support a feature that didn't work. Removing the feature simplified both the code and the user experience. The My Stuff button is a better entry point anyway.



