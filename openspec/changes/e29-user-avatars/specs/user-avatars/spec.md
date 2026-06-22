# user-avatars Specification (e29 draft)

## Purpose
User avatar display — fetch Reddit snoovatar URLs and display real user avatars next to usernames, with in-app hyperlinks to Reddit profiles.

## ADDED Requirements

### Requirement: CSP test determines feasibility
Before any implementation, the system SHALL perform a CSP test to determine if snoovatar URLs can be displayed directly in the webview. If CSP blocks the images, the feature requires a proxy layer.

#### Scenario: Snoovatar URL is allowed by CSP
- **WHEN** the CSP test displays a snoovatar URL in an `<img>` tag
- **THEN** the image loads successfully
- **AND** the feature proceeds to Phase 2

#### Scenario: Snoovatar URL is blocked by CSP
- **WHEN** the CSP test displays a snoovatar URL in an `<img>` tag
- **THEN** the image fails to load (broken image icon)
- **AND** the feature is deferred (requires proxy layer via `media.upload()`)

### Requirement: Avatar is cached server-side with 24h TTL
The system SHALL cache snoovatar URLs in Redis with a 24h TTL to avoid repeated Reddit API calls.

#### Scenario: First request for a user's avatar
- **WHEN** the server receives a request for a user's avatar
- **THEN** the server calls `reddit.getUserByUsername(username)` and `user.getSnoovatarUrl()`
- **AND** the URL is cached in Redis with 24h TTL
- **AND** the cached URL is returned

#### Scenario: Subsequent request within 24h
- **WHEN** the server receives a request for a user's avatar within 24h of the first request
- **THEN** the server returns the cached URL without calling the Reddit API

### Requirement: Avatar uses progressive enhancement
The avatar display SHALL show the initial-letter circle immediately, then swap to the real avatar when loaded. No flickering.

#### Scenario: Avatar loads successfully
- **WHEN** the avatar image loads
- **THEN** the initial-letter circle is replaced by the real avatar
- **AND** the transition is smooth (no layout shift)

#### Scenario: Avatar fails to load
- **WHEN** the avatar image fails to load
- **THEN** the initial-letter circle remains visible
- **AND** no error is shown to the user

### Requirement: Avatar click navigates to Reddit profile
Clicking an avatar SHALL navigate to the user's Reddit profile page.

#### Scenario: User clicks an avatar
- **WHEN** the user clicks on an avatar
- **THEN** the app calls `navigateTo("https://www.reddit.com/user/{username}")`
- **AND** the Reddit profile opens in the Reddit browser
