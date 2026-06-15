# v1.4.1 — Tracking Refactor: OpenSpec as Single Source of Truth

This is a tracking refactor with **no code changes**. The app remains at the v1.4.0 stable baseline.

## What changed

### New principle (LEARNINGS.md §40)
**OpenSpec is the single source of truth for all requirement and bug tracking.**

The legacy `BUG_REGISTRY.md`, `ENHANCEMENTS.md`, and `AUDIT.md` files are now archived with archive headers pointing to the new tracking. They are kept for historical reference only — do not edit.

### Build agent updated
`~/.config/opencode/agent/build.md` now requires the agent to:
1. First, create an OpenSpec change (`openspec/changes/<name>/`) with `proposal.md` (including `**Priority:** N/5` field), `tasks.md`, and (for user-visible changes) `specs/<cap>/spec.md`.
2. Validate with `openspec validate <name>` before any code is written.
3. Then delegate implementation to a `general` subagent.
4. After implementation, run `openspec archive <name>` to merge the change into the main spec.

### 17 new OpenSpec changes

**Enhancements (5):**
| Change | Priority | Status |
|---|---|---|
| `e3-attendee-preview-on-home-card` | 5/5 | proposed |
| `e1-event-capacity` | 4/5 | proposed |
| `e2-edit-event` | 3/5 | proposed |
| `e9-notify-opt-in` | 1/5 | future (Devvit push gated) |
| `e10-search-filter-ui` | 1/5 | future |

**Security (3):**
| Change | Priority | Status |
|---|---|---|
| `fix-sec1-webhook-consent` | 5/5 | proposed |
| `fix-sec2-rate-limiting` | 4/5 | proposed |
| `fix-sec3-csv-injection` | 3/5 | proposed |

**Bug fixes (6):**
| Change | Priority | Status |
|---|---|---|
| `fix-bug3-first-cron-skip` | 3/5 | proposed |
| `fix-bug2-cron-reminder-retry` | 2/5 | proposed |
| `fix-bug5-default-event-magic-string` | 2/5 | proposed |
| `fix-bug6-past-event-rsvp-block` | 2/5 | proposed |
| `fix-bug7-rsvp-confirm-update` | 2/5 | proposed |
| `fix-bug8-confirm-resolver-queue` | 2/5 | proposed |

**Bundle changes (3):**
| Change | Priority | Status |
|---|---|---|
| `ux-polish-bundle` | 2/5 | proposed (UX12, 13, 14) |
| `perf-polish-bundle` | 2/5 | proposed (PERF4, 5, 6) |
| `cq-polish-bundle` | 1/5 | proposed (CQ3, 5, 7, 8, 10, 12) |

## Verification

- `openspec validate --all` → 19/19 passed
- `npm run build` → OK
- `npm test` → 6/6 passed
- `npm run type-check` → OK
- No code changes; v1.4.0 stable baseline preserved

## Next steps

- **Top priority:** implement `e3-attendee-preview-on-home-card` (5/5), `e1-event-capacity` (4/5), `e2-edit-event` (3/5).
- **After those:** security fixes `fix-sec1-webhook-consent` (5/5), `fix-sec2-rate-limiting` (4/5), `fix-sec3-csv-injection` (3/5).
- **Future:** `e9-notify-opt-in` and `e10-search-filter-ui` parked at 1/5.

Each implementation should:
1. Read the OpenSpec change (`proposal.md` + `design.md` + `tasks.md` + `spec.md`).
2. Follow `tasks.md` to track progress.
3. After all tasks are checked off and tests pass, run `openspec archive <name>` to move the spec into the main spec archive.

## File reference

- `openspec/changes/` — 17 active change proposals
- `openspec/specs/` — archived/main specs (currently `unified-card-shell-ui` from v1.4.0)
- `LEARNINGS.md` §40 — the new principle
- `BUG_REGISTRY.md`, `ENHANCEMENTS.md`, `AUDIT.md` — archived (do not edit)
