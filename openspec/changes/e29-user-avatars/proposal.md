# e29-user-avatars

**Priority:** 1/5 (very low)

## Why

The app currently shows a simple circle with the first letter of the username as the "avatar" for organizers and attendees. Reddit provides user snoovatar (avatar) URLs via the Devvit API. Fetching and displaying real user avatars would make the app feel more polished and connected to Reddit's identity system. Clicking an avatar could also link to the user's Reddit profile.

However, this feature has significant technical risks that must be evaluated before implementation:

1. **CSP blocking**: Devvit webviews have strict Content Security Policy that may block external images (snoovatar URLs are on `redditstatic.com` or `i.redd.it`). If CSP blocks them, a proxy layer is needed.
2. **Rate limiting**: Each avatar requires `reddit.getUserByUsername()` + `getSnoovatarUrl()`. Showing 20 attendees means 40 API calls per page load.
3. **Performance**: Avatar loading adds latency. Users on slow connections will see flickering.
4. **Complexity**: Touches many files, needs server endpoint + caching + CSP test.

## What changes

### Phase 1: CSP Test (binary go/no-go)
| # | Task | Acceptance |
|---|------|------------|
| 1 | Add temporary `/api/avatar-test` endpoint that returns a snoovatar URL for a test user | Endpoint returns the URL |
| 2 | Try to display the URL in an `<img>` tag in the webview | If image loads → proceed. If blocked → feature requires proxy layer (significantly more complex) |

### Phase 2: If CSP Test Passes
| # | Task | Acceptance |
|---|------|------------|
| 3 | Add server-side avatar cache: `/api/avatar/{username}` endpoint with 24h Redis TTL | First call fetches from Reddit API, subsequent calls return cached URL |
| 4 | Batch-fetch avatars on server side for home card / attendee lists | Avatars returned with event data, no extra client calls |
| 5 | Update `.avatar-circle` CSS to support `<img>` with fallback to initial letter | Progressive enhancement — initial letter shows immediately, avatar swaps in when loaded |
| 6 | Add `navigateTo(user.url)` on avatar click | Clicking avatar opens Reddit profile |
| 7 | Update organizer display (event details, mod dashboard) | Shows real avatar instead of initial letter |
| 8 | Update attendee lists (share posts, reminder posts) | Shows real avatars in attendee sections |
| 9 | Add unit tests for avatar cache logic | Tests pass |
| 10 | Deploy and verify on iOS Safari | Avatars load correctly, no CSP issues |

## Out of Scope

- **Avatar upload/customization** — Reddit manages snoovatars, we just display them
- **Avatar in share/reminder post body** — Reddit markdown doesn't support inline images; avatars are display-only in the webview
- **Real-time avatar updates** — 24h cache TTL is sufficient; snoovatars change infrequently

## Cross-cutting decisions

- **Cache TTL = 24h**: Snoovatars change infrequently. 24h balances freshness vs API calls.
- **Progressive enhancement**: Show initial-letter circle immediately, swap to real avatar when loaded. No flickering.
- **Server-side caching**: Client never calls Reddit API directly. Server fetches, caches, returns URL.
- **CSP test is binary**: If snoovatar URLs are blocked by CSP, the feature requires a proxy layer (upload each avatar via `media.upload()`). This adds significant complexity and may not be worth the effort for a cosmetic improvement.

## Task list

See `tasks.md`.
