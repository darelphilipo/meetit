## ADDED Requirements

### Requirement: Mod dashboard filters default events by prefix
The system SHALL filter out events whose `id` starts with `default-` from the mod dashboard's published list.

#### Scenario: Default event exists
- **WHEN** the event has `id = "default-bangalore-tech-chai"`
- **THEN** it is filtered out of the mod dashboard's published tab

#### Scenario: Future default event added
- **WHEN** a new event is created with `id = "default-mumbai-tech-2027"`
- **THEN** it is also filtered out (prefix match, not exact string)
