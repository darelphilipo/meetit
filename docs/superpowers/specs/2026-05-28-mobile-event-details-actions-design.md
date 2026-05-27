# Mobile Event Details Actions Design

## Problem

On mobile, event descriptions can become long enough that pressing `Read more` pushes the Google Maps row and `Who's Going?` button out of reach in the event details overlay. Users then cannot reliably copy the map link or open the attendee list from the details step.

## Approved Direction

Use option A: keep Google Maps and `Who's Going?` on the existing details step, but separate the expanded description into its own vertical scroll area. This preserves the current three-step event details flow and avoids adding extra taps.

## Behavior

- The details overlay remains a three-step flow.
- Step 2 keeps organizer, description, Google Maps, and `Who's Going?`.
- When an event has a long description, the description area has a bounded height and scrolls vertically.
- Google Maps and `Who's Going?` remain visible below the description area in the same card.
- `Read more` and `Read less` continue to toggle between short and full description text.
- The overlay's footer controls remain fixed at the bottom as they do now.

## Implementation Notes

- Add reusable CSS classes for the step-2 detail card, bounded description region, and action area in `public/app.html`.
- Update the step-2 markup in `src/client/app.ts` to use those classes instead of inline-only layout.
- Keep all existing button classes and IDs so current event binding continues to work.
- Build the app so generated `public/app.js` matches the TypeScript source.

## Verification

- Run the app build.
- Run the existing behavior tests.
- Use a local mobile-sized preview to confirm that expanding a long description leaves Maps and `Who's Going?` reachable.
