## ADDED Requirements

### Requirement: Render functions have error boundaries
The system SHALL wrap each major render function (`renderHomeCard`, `renderModCard`, `renderMyRsvpCard`, `renderMyEventCard`, `renderMyPitchCard`) in a try/catch block. On error, the body SHALL display an error state and the error SHALL be logged.

#### Scenario: Render throws
- **WHEN** `renderHomeCard` throws an exception
- **THEN** the home screen shows "😵 Render error: {message}"
- **AND** the error is logged to the debug panel

### Requirement: Reduced-motion media query disables animations
The system SHALL include `@media (prefers-reduced-motion: reduce)` rules in `public/app.html` that disable animations and transitions for users with motion sensitivity.

#### Scenario: User prefers reduced motion
- **WHEN** the user's OS setting is "reduce motion"
- **THEN** all CSS animations and transitions are disabled

### Requirement: Lint and format scripts in package.json
The system SHALL provide `npm run lint`, `npm run lint:fix`, `npm run format`, and `npm run format:check` scripts backed by ESLint and Prettier configuration files.

#### Scenario: Developer runs lint
- **WHEN** the developer runs `npm run lint`
- **THEN** ESLint reports any code style issues and exits non-zero on errors
