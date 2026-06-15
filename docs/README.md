# Meetit — Documentation Index

> Single entry point for all project documentation.
> For requirement and bug tracking, see `../openspec/`.

---

## Live tracking (active work)

| What | Where |
|---|---|
| **All requirements, enhancements, and bug fixes** | `openspec/changes/` — 18 active change proposals (run `openspec list`) |
| **Archived/main specs** | `openspec/specs/` — completed changes promoted to main spec |
| **Archived changes** | `openspec/changes/archive/` — completed changes (history) |

## Project documentation (always current)

| File | Purpose |
|---|---|
| `../LEARNINGS.md` | Platform quirks, patterns, and lessons learned (40 sections). Referenced by agents and humans. |
| `../TEST_CASES.md` | Manual end-to-end test suite (3 tests) for the r/meetup_hub2_dev beta. |
| `../README.md` | Project overview, setup, build commands. |

## Archived (historical, do not edit)

| File | What it was | Archived |
|---|---|---|
| `archive/BUG_REGISTRY.md` | Bug list (all entries fixed) | 2026-06-15 |
| `archive/ENHANCEMENTS.md` | Enhancement backlog (migrated to OpenSpec) | 2026-06-15 |
| `archive/AUDIT.md` | Full app audit (migrated to OpenSpec) | 2026-06-15 |

These files are kept for the historical record (who fixed what and when). Do not add new entries — see `openspec/changes/` instead.

## Release notes (historical)

| Version | Date | Notes |
|---|---|---|
| `releases/v1.4.0.md` | 2026-06-15 | Unified Card Shell UI (Stable Release) |
| `releases/v1.4.1.md` | 2026-06-15 | Tracking Refactor: OpenSpec as Single Source of Truth |

## Source code

| Directory | Purpose |
|---|---|
| `../src/server/` | Devvit Web server (API endpoints, Redis, CRON) |
| `../src/client/` | Browser app (UI, event delegation, debug panel) |
| `../src/shared/` | Shared TypeScript types and utilities |
| `../public/` | Static HTML/CSS for the inline webview |
| `../tools/` | Build script + test harness |
| `../openspec/` | OpenSpec changes and specs |
