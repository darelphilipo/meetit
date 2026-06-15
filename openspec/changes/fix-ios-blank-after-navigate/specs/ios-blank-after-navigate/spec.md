## ADDED Requirements

### Requirement: visibilitychange re-init
The system SHALL register a `visibilitychange` event listener that, when the document becomes visible again, triggers a re-render of the current app state. The listener SHALL be throttled and SHALL NOT double-fire if a re-render is already in progress.

#### Scenario: User returns from a navigateTo call
- **WHEN** the user taps a link that calls `navigateTo(url)`
- **AND** the user taps Back to return to the Meetit webview
- **THEN** the app re-renders the current tab without requiring a manual refresh
- **AND** the debug panel logs `visibilitychange state=visible action=reinit`

#### Scenario: User rapid-focus-blur
- **WHEN** the user focus-blur-focuses the webview within 500ms
- **THEN** only the first visibility event triggers a re-render
- **AND** subsequent events within the throttle window log `action=throttled`

#### Scenario: Re-render already in progress
- **WHEN** a visibility event fires while a re-render is in flight
- **THEN** the handler logs `action=skipped (in-flight)` and does not start a second re-render

### Requirement: Safe on desktop
The system SHALL NOT regress desktop behavior. The visibilitychange handler is a no-op on desktop browsers that fire no visibility events for in-app navigation.

#### Scenario: Desktop Reddit webview
- **WHEN** the user uses the Meetit app on desktop
- **AND** triggers a navigateTo + Back
- **THEN** the app re-renders correctly (existing behavior, preserved)
- **AND** the visibilitychange handler does not introduce any new console errors or render glitches

### Requirement: Long-absence full re-init
The system SHALL trigger a full re-init (not a soft render) when the user has been away from the webview for more than 5 minutes. This handles stale data, expired sessions, and Redis state changes that happened while the user was gone.

#### Scenario: User returns after 10 minutes
- **WHEN** the visibility event fires after a > 5 minute absence
- **THEN** the handler triggers a full re-init (re-fetches home data, re-runs init logic)
- **AND** the debug panel logs `action=reinit (long-absence)`

#### Scenario: User returns after 30 seconds
- **WHEN** the visibility event fires after a < 5 minute absence
- **THEN** the handler triggers a soft render (re-render current tab without full re-init)
- **AND** the debug panel logs `action=soft-render`
