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

### Requirement: Category data has a single source of truth
The system SHALL define event categories exactly once, in `EventCategories` (`src/shared/api.ts`). The `CAT_MAP` in `src/client/app.ts` and the `CATEGORY_EMOJI` in `src/shared/meetit.ts` SHALL be derived from `EventCategories` at module load time, not duplicated.

#### Scenario: Adding a new category
- **WHEN** a developer adds a new entry to `EventCategories` in `api.ts`
- **THEN** the new category is automatically available in the home card category badge, mod card category badge, My Stuff form, and pitch form
- **AND** no other file needs to be edited

#### Scenario: Category emoji renders correctly
- **WHEN** a user creates a pitch with category "tech"
- **THEN** the form shows the 💻 emoji (from `EventCategories[tech].emoji`)
- **AND** the home card shows the same emoji in the category badge
