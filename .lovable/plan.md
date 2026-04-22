

# Status check: Coach Dashboard v1 not yet built

The plan was approved and I confirmed the `GameSetup` opponent linking, but the actual build was not executed — no dashboard files have been created yet.

## What exists today
- `src/routes/dashboard.tsx` — still the stub `StubPage` ("Phase 5") behind `ProtectedShell coachOnly`.
- No `src/components/dashboard/` directory.

## What I will build now (unchanged from approved plan)

**Update**
- `src/routes/dashboard.tsx` → renders `<DashboardPage />` inside `<ProtectedShell coachOnly>`.

**Create under `src/components/dashboard/`**
- `DashboardPage.tsx` — title + tabs row. `Scout Reports` active; `Learning Insights`, `Development`, `At-Bat Trends` disabled with "Coming soon".
- `ScoutReportsTab.tsx` — local nav state (`list | sessions | report`) with back button.
- `OpponentList.tsx` — groups strictly by `games.opponent_id`; orphans surface as muted footer "X sessions missing opponent link".
- `OpponentSessionList.tsx` — sessions for selected opponent, sorted by `game_date` desc, with date / tournament / score / status / obs count.
- `ScoutingReportView.tsx` — single-game report: header, Team Observations by inning, Player-Level Intel by jersey, Pitcher Intel, Steal It Wall, Coach Game Plan.
- `GamePlanEditor.tsx` — debounced (800ms) autosave to `scouting_reports` keyed by `(game_id, coach_id)`; insert-then-update lifecycle, race-safe, flush on unmount.

**Behavior locked in**
- Opponent grouping: `opponent_id` only, no string matching.
- Orphan wording: "X sessions missing opponent link".
- Null `applies_to_team` → muted "Unspecified" chip.
- No schema, RLS, or Scout Mode changes.

Approve and I will switch to build mode and ship it.

