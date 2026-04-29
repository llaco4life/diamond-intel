## Problem

On the new 14U team, `/pitch/codes` shows no pitchers and no Import option because:

- Pitchers live in the `pitchers` table, which is tied to a `game_id`.
- The codes page builds its pitcher dropdown by querying `pitchers` joined to `games`, then filtering to the active team.
- The 14U team has no games yet → no pitcher rows → empty dropdown → no way to add or import codes.

Pitch code mappings (`pitch_code_map`) themselves are already team-scoped correctly. The blocker is **pitcher discovery**, not the codes themselves.

## Goal

Every new team should be able to set up pitch codes without first having to start a game — same setup and capability as the 12U team, but with isolated data.

## Approach: Team-scoped pitcher roster

Add a lightweight "team pitcher roster" so coaches can add pitchers to a team directly from `/pitch/codes`, then map codes to them. Existing game-based pitchers continue to work and merge into the same view.

### 1. Schema (migration)

Add a nullable `team_id` to `pitchers` so a pitcher row can belong to a team without belonging to a game:

- `pitchers.team_id uuid null` (references `teams.id` conceptually; no FK per project convention).
- `pitchers.game_id` becomes nullable (a roster pitcher exists before any game).
- Add a check/validation: at least one of `team_id` or `game_id` must be set.
- Update RLS on `pitchers`:
  - SELECT/INSERT/UPDATE/DELETE allowed when EITHER the linked `game.org_id = get_my_org_id()` OR the linked `team.org_id = get_my_org_id()`.

No data migration needed — existing pitcher rows keep their `game_id` and just have `team_id = null`.

### 2. Codes page (`src/routes/pitch.codes.tsx`)

- Query pitchers in two buckets and merge:
  1. `pitchers` where `team_id = activeTeamId`
  2. `pitchers` joined to `games` where `games.team_id = activeTeamId` (current behavior)
- De-dupe by jersey + name (already happens).
- Add an "Add pitcher" affordance at the top of the page (jersey #, optional name) that inserts a row with `team_id = activeTeamId`, `game_id = null`. This unblocks Template / Import .xlsx immediately.
- Keep all existing controls: Template download, Import .xlsx, manual add row, untagged-codes assignment.

### 3. Game flow (no behavior change for users)

When a coach starts a Pitch Intel game and adds a pitcher who already exists on the team roster (same jersey #), reuse/link that pitcher rather than creating a duplicate. If they add a brand-new pitcher in-game, also stamp `team_id` on the new row so it appears in the codes page next time.

This is a small follow-up edit in the pitcher creation paths inside `src/routes/pitch.$gameId.tsx` and `src/components/pitch/PitcherManagerDialog.tsx` (set `team_id: activeTeamId` on insert).

### 4. Empty state copy

When the active team has zero pitchers (roster + games), replace the current "No pitchers in the system yet. Start a Pitch Intel game…" message with:

> "No pitchers for {team name} yet. Add one below or download the template to bulk import."

…and show the Add Pitcher form + Template/Import buttons immediately.

## Files to change

- New migration: add `team_id` to `pitchers`, make `game_id` nullable, update RLS.
- `src/routes/pitch.codes.tsx` — merged pitcher query, Add Pitcher form, updated empty state.
- `src/routes/pitch.$gameId.tsx` — stamp `team_id` when creating in-game pitchers; reuse existing roster pitcher by jersey when present.
- `src/components/pitch/PitcherManagerDialog.tsx` — same stamping/reuse on insert.

## Out of scope

- Roster management UI beyond the codes page (a dedicated Pitchers page can come later).
- Backfilling `team_id` on historical pitcher rows (not needed; they remain reachable via their game).
