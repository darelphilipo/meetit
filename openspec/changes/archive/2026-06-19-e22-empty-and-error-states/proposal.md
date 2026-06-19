# Change: Empty & Error State System

**Priority:** 3/5

## Why

A UI audit (June 2026) found 8 distinct empty states and 6+ error/loading states implemented inconsistently across `app.ts`:

**Empty states — wildly inconsistent:**
- Home: rich (emoji + headline + body + 2 CTAs)
- My Stuff 3 tabs: 2 use compact, 1 doesn't, copy varies
- Mod dashboard 3 tabs: all "No X events" with no CTA at all
- Inline attendees (line 712): raw inline `<div>` with no card chrome
- Mod attendees (line 1697): "👥 No RSVPs yet" inside a different container

**Error states — half the time silent, half the time hostile:**
- `app.ts:530`: "❌ Could not load" — uses ❌ emoji (hostile for a community app)
- `app.ts:1735`: "Failed to load attendees" — single line, no retry, no card chrome
- `app.ts:295`: silent — just updates the loading-msg span
- `app.ts:1038`: silent — just sets `setModLoading(false)`
- `app.ts:870`: silent — falls back to fake event with empty fields
- `app.ts:748, 1627, 1785`: silent — just a log line

**Loading states — only the initial home load has a proper loading screen:**
- The first paint has a beautiful bouncing-emoji + progress bar
- Every other async wait point uses raw inline text "⏳ Loading..." (3 different inline styles: lines 516, 1611, 1683)

**Form validation — 3 places, 2 languages:**
- Toast errors for missing required fields (`app.ts:1903, 1967, 1968, 1979, 2056, 2058`)
- Only the Category field has a `<span class="req">*</span>` marker (`app.html:418`)
- All other required fields (Title, Date, Time, Location, Description) have no visual required indicator

## What changes

### 1. New `renderEmptyState()` helper

A single helper in `app.ts` that produces a consistent empty-state card. Replaces 8+ inline variations.

Signature:
```ts
function renderEmptyState(opts: {
  emoji: string;       // e.g. "🐱" "🔍" "💡" "📋" "🎟️" "👥"
  title: string;       // headline, e.g. "Wow, so empty!"
  body?: string;       // optional body copy
  ctas?: Array<{       // optional 1-2 buttons
    label: string;
    action: string;    // data-action
    variant: "pink" | "white" | "green";
  }>;
  compact?: boolean;   // true for in-overlay variants
  context?: "home" | "filter" | "my-stuff-rsvps" | "my-stuff-pitches" | "my-stuff-events" | "mod-pending" | "mod-published" | "mod-pitches" | "attendees" | "rsvp-list";
}): string
```

Each `context` provides a fallback default copy if `title`/`body` is not provided. Context-specific defaults are defined in a single `EMPTY_STATE_DEFAULTS` const.

### 2. New `renderErrorState()` helper

A single helper that produces a card with an emoji, message, and a "Tap to retry" CTA.

Signature:
```ts
function renderErrorState(opts: {
  message: string;     // e.g. "Couldn't load events"
  retryAction?: string; // data-action for retry, e.g. "refresh-home"
  compact?: boolean;
}): string
```

The retry CTA, when clicked, dispatches the action via `handleAction(retryAction)`. The default `retryAction` is `null` (no retry button — for fatal states).

### 3. New `renderSkeleton()` helper

A loading-state card with 3 shimmer bars.

Signature:
```ts
function renderSkeleton(opts: {
  bars?: number;       // default 3
  compact?: boolean;
}): string
```

Uses CSS `linear-gradient` shimmer animation (defined in `app.html`).

### 4. New CSS keyframes for shimmer

In `app.html`:
```css
@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
.skeleton-bar {
  background: linear-gradient(90deg, var(--surface) 0%, var(--outline-v) 50%, var(--surface) 100%);
  background-size: 200px 100%;
  animation: shimmer 1.4s linear infinite;
  height: 16px;
  margin-bottom: 10px;
  border: var(--border);
}
```

### 5. Migration of all empty/loading/error sites

Replace the 11 empty-state sites listed in the audit with `renderEmptyState()` calls:

| Line | Context | New defaults |
|------|---------|--------------|
| 336 | Home (first-use) | "🐱 / Wow, so empty! / No events yet — be the first spark ✨ / [💡 Pitch Idea (pink), 📋 Submit Event (white)]" |
| 442 | Search filter | "🔍 / Nothing matches that vibe / Try a different filter" |
| 539 | My Stuff → RSVPs | "🎟️ / No RSVPs yet / Go to the Home tab to find your people / [← Back to Home (white)]" |
| 582 | My Stuff → Pitches | "💡 / No pitches yet / Got an idea? Pitch it from the Create menu / [💡 Pitch an Idea (pink)]" |
| 623 | My Stuff → Events | "📋 / No events yet / Submit an event from the Create menu / [📋 Submit Event (white)]" |
| 712 | Inline attendees | "👥 / No one yet — be the first!" (compact) |
| 1216 | Mod → Pending | "📋 / No pending events / Nothing to review right now" |
| 1230 | Mod → Published | "✅ / No published events / Approved events will appear here" |
| 1242 | Mod → Pitches | "💡 / No pitched ideas / Community pitches will appear here" |
| 1635 | RSVP list (in details) | "🎟️ / No RSVPs yet" (compact) |
| 1697 | Mod attendees | "👥 / No RSVPs yet" (compact) |

Replace the 6+ error sites:

| Line | Replace with |
|------|--------------|
| 295 (loadHome) | Set loading-msg to "Couldn't load events" + show error state in container (replace the bouncing emoji block) |
| 530 (loadMySubmissions) | `renderErrorState({ message: "Couldn't load My Stuff", retryAction: "open-my-stuff" })` |
| 1735 (mod attendees) | `renderErrorState({ message: "Couldn't load attendees", retryAction: "view-attendees-mod" })` |
| 1038 (loadModTab) | Show error state in pending-events-container with retry |
| 870 (event details) | Show error state in detail-body with retry (no fallback to fake empty event) |
| 748, 1627, 1785 | At minimum, log + show toast. Don't change behavior beyond visibility. |

Replace the 3 loading-state inline sites with `renderSkeleton()`:

| Line | Replace with |
|------|--------------|
| 516 (loadMySubmissions) | `renderSkeleton({ bars: 4 })` |
| 1611 (attendees in details) | `renderSkeleton({ bars: 3, compact: true })` |
| 1683 (mod attendees) | `renderSkeleton({ bars: 3, compact: true })` |

### 6. Required-field markers + inline validation

In `app.html`, add `<span class="req">*</span>` to every required field label:

- `event-title` (line 417)
- `event-date` (line 439)
- `event-time` (line 440)
- `event-location` (line 442)
- `event-desc` (line 419) — actually this is on step 3
- `pitch-title` (line 395) — currently no asterisk but title is required (`app.ts:1903`)
- `pitch-description` (line 396) — required (`app.ts:1903`)

Add CSS for `.req`:
```css
.req { color: var(--secondary); font-weight: 700; }
```

In `app.ts`, add a `validateField(el, message)` helper that:
- Adds an error class to the field's parent `.form-group`
- Inserts a `<div class="form-error">message</div>` after the input/textarea
- Returns true if valid, false if invalid

Refactor the existing toast-based validation in `eventNext()` (lines 1967-1968, 1979-1980) and `submitEvent()` (line 2056) to use inline validation. The toast stays as a fallback for less critical feedback.

## Out of scope

- The initial `loading-screen` (bouncing emoji + progress bar) — keep as-is
- `setBtnLoading()` button-level loading (good as-is)
- The `confirm-overlay` (destructive confirm dialog — different concern)
- Toast messages (keep using `showToast()` for non-field errors)
- Skeleton for the home page itself (it already has the loading-screen)
- Animating empty-state enter (e23 microinteractions)

## Risk

- **Medium**: changing 11 empty states is wide-reaching. Visual is byte-identical for each site (same emoji, same text, same CTAs) but errors must not regress the "no events yet" path. Mitigation: each replacement is mechanical; the spec mandates identical emoji/title/body/CTAs.
- **Low**: skeleton shimmer is a new visual; runs at 1.4s loop. Will respect `prefers-reduced-motion` (existing media query at `app.html:258-261` covers `*` so it's automatic).
- **Low**: inline validation changes the UX of submitting events. The "Fill all fields" toast was a single message — now each empty field gets its own inline error. This is a UX upgrade, not a regression.

## Verification

- `openspec validate e22-empty-and-error-states --strict` — must pass
- `npx tsc --noEmit` — no new TS errors
- `npm run build` — must build clean
- `npm test` — all 10 tests pass
- Empty-state visual regression: each of the 11 sites must show the same emoji + title + body + CTA as before (helper is pure visual; behavior is unchanged)
- Error-state regression: each error site that previously was silent now shows a card with a retry button. Sites that previously showed a toast still show the toast PLUS the new card.
- Form validation regression: Submit Event with empty title now shows inline error under the title field, not a toast
