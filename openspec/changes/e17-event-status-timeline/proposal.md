## Why

Organizers who submit an event see "⏳ Pending" with no context for how long it has been waiting or what to expect. Approved events show no indication of momentum — "12 RSVPs" feels static, not growing. A small relative-time label ("Submitted 2 days ago") and a one-line review-SLA hint ("Usually reviewed within 48hrs") answers the most common organizer question: "what is happening with my event?"

The fix is a 10-line `formatRelativeTime(ms)` utility in `meetit.ts` plus a label rendered in `renderMyEventCard()` and `renderMyPitchCard()`. No new dependencies (skills.md mentions `date-fns` as the standard, but for a single relative-time formatter the dependency is overkill; we write our own).

## Priority: 2/5

## Status: proposed

## What Changes

- Add a `formatRelativeTime(timestampMs)` function to `src/shared/meetit.ts` that returns a short human label: "just now", "5m ago", "2h ago", "yesterday", "3d ago", "2w ago", "Jan 15".
- Use it in `renderMyEventCard()` and `renderMyPitchCard()` to show a "📅 Submitted 2 days ago" line under the event/pitch title for pending items.
- For approved events, show a "📈 12 RSVPs · approved 2 days ago" line.
- For rejected items, show "❌ Rejected 2 days ago" (status + relative time).
- Add a small "Usually reviewed within 48hrs" hint as a static string next to pending items. Make this a constant so it can be updated in one place if the SLA changes.
- Log `[FEATURE] status-timeline id={id} status={status} ageLabel={label}` on render so we can see the formatter in action.

## Capabilities

### New Capabilities
- `event-status-timeline`: Relative-time status labels on My Stuff cards, with a one-line review-SLA hint for pending items. Pure client-side rendering using a small shared utility.

### Modified Capabilities
- None.

## Impact

- `src/shared/meetit.ts`: new `formatRelativeTime(ms: number): string` export. Handles: < 60s ("just now"), < 60m ("Nm ago"), < 24h ("Nh ago"), < 7d ("Nd ago"), < 30d ("Nw ago"), else absolute date "MMM D".
- `src/client/app.ts`: new helper invocation in `renderMyEventCard()` and `renderMyPitchCard()`. For pending, show "📅 Submitted {label} · Usually reviewed within 48hrs". For approved, show "📈 {rsvpCount} RSVPs · approved {label}". For rejected, show "❌ Rejected {label}".
- `public/app.html`: small `.status-timeline` class with `font-size: 11px; color: #666; margin-top: 4px`.
- `LEARNINGS.md`: no new section; the formatter is straightforward and follows the existing utility pattern.

## Out of Scope

- Localization (English-only; the format strings are hardcoded).
- Real-time "refreshing" of the relative time (e.g., "5m ago" → "6m ago" without a re-render). The card is re-rendered on focus, which is enough for v1.
- Custom SLA per subreddit (the "48hrs" hint is a constant; configurable per subreddit is a separate change).

## Decisions (to be made during design phase)

- **Formatter thresholds:** use the buckets above. The absolute-date fallback for > 30 days prevents the label from getting awkwardly long.
- **Pending vs approved line position:** the timeline line goes immediately under the title, before the existing action buttons. Keeps the "what is happening" info at the top of the card.
- **Color:** `#666` is the existing secondary text color. The status emoji (📅, 📈, ❌) carries the semantic weight, not the color.
- **No new dependency:** the formatter is 10 lines. Adding `date-fns` for one function is over-engineering (and would force a package.json change for a 1-function utility).
