# rsvp-share Specification (e28 update)

## ADDED Requirements

### Requirement: Share post includes list of other attendees

The "u/${username} is going to ..." share post body SHALL include an "Also going" section listing the other users who have RSVPed to the same event (excluding the current user).

#### Scenario: 0 other attendees
- **WHEN** the user is the only person RSVPed to the event
- **THEN** the "Also going" section is omitted from the post body entirely
- **AND** no "👥 Also going" line appears in the rendered post

#### Scenario: 1-20 other attendees
- **WHEN** between 1 and 20 other users have RSVPed to the event
- **THEN** the post body includes `## 👥 Also going (N): u/user1 u/user2 ...` with all N usernames

#### Scenario: 20+ other attendees
- **WHEN** more than 20 other users have RSVPed to the event
- **THEN** the post body includes the first 20 alphabetically-sorted usernames followed by `+N more` (e.g., `u/alice u/bob ... +5 more`)

#### Scenario: Username normalization
- **WHEN** the RSVP zset contains usernames with or without the `u/` prefix
- **THEN** the rendered post body shows each username with exactly one `u/` prefix (no `u/u/username` artifacts)

#### Scenario: Case-insensitive dedup
- **WHEN** the RSVP zset contains both `Alice` and `alice` (same person, different case)
- **THEN** the post body lists the user only once (case-insensitive dedup)
