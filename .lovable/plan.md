## First — your data is safe

Nothing was lost. Checked the database directly:

- **2 teams exist**: Unity 12u and Unity 14u
- **6 games** still in DB (all currently untagged — `team_id = NULL`)
- **300 pitch code mappings** still in DB (also untagged)
- **Coach memberships**: 1 user is mapped to each team

The reason it "looks empty" is that none of the existing games or pitch codes are linked to a team yet, so when a team is active, the team-scoped views filter them out. We'll backfill them to Unity 12u so 14u starts clean for this weekend.

## What's broken

**1. "Set active" does nothing visible.**
The active-team state lives in a hook (`useActiveTeam`) that's instantiated separately in the header switcher and the teams page. Each copy has its own local state, so clicking "Set active" updates the DB and that page, but the header chip and the rest of the app never see the change. On top of that, an init effect re-runs every time the auth profile reloads and resets the active team back to a stale value — fighting the user's click.

**2. No per-team card.**
There's no view that shows "this is your active team's roster + coaches" side by side. The Profile page has an Active Team summary but doesn't list the roster or coach names.

**3. Existing data isn't tied to a team.**
All 6 games and 300 pitch codes have `team_id = NULL`, so when Unity 14u is active they correctly disappear, but when Unity 12u is active they also disappear (the queries filter by team_id).

## Plan

### 1. Backfill existing data to Unity 12u (one-time, safe)

Set `team_id = '30afcd75…' (Unity 12u)` on every row that's currently NULL in:
- `games` (6 rows)
- `pitch_code_map` (300 rows)
- `pitchers` (via their game) and `at_bats` (via their game) — these are scoped through `game_id`, so updating `games.team_id` is enough; no schema change needed for them.
- `scout_observations` — same, scoped through `game_id`.

Result: every existing game, scout note, and pitch code will appear under Unity 12u. Unity 14u starts with a clean slate.

### 2. Fix active-team switching (the real bug)

Replace the per-component `useActiveTeam` state with a single shared context provider mounted once in `__root.tsx`:

- New `ActiveTeamProvider` holds `teams`, `activeTeamId`, `setActiveTeamId` once for the whole app.
- `useActiveTeam()` becomes a thin `useContext` consumer — every component reads the same value.
- Remove the init effect that fights user clicks. Initialization runs **once** when teams first load; after that, only explicit `setActiveTeamId` calls change it.
- Clicking "Set active" in `/teams`, picking from the header dropdown, or the team detail page all update the same state, so the header chip, profile card, scout mode, and pitch intel all switch together immediately.

### 3. Per-team Active Team card (roster + coaches)

Upgrade the Active Team card on `/profile` and add a compact version to `/teams/$teamId`:

- **Header**: logo, team name, age group · season, your role on this team
- **Roster section**: list of jersey # + name from `team_roster` for the active team (with link to /teams/$teamId to edit)
- **Coaches section**: names + roles pulled from `team_memberships` joined to `profiles`, grouped Head Coach / Assistant Coach / Players
- **Empty states**: "No roster yet — add players" with link to team detail; "No assistant coaches yet — invite from team page"

So Unity 12u shows its players + coaches, Unity 14u shows its (empty for now) — clear separation.

### 4. Small guardrails

- Header `TeamSwitcher` shows a checkmark on the active team and switches instantly.
- Active team selection persists across reloads (already does via profile + localStorage; the bug was just the re-init).
- When you switch to Unity 14u, Pitch Intel and Scout Mode show empty (correct — that team has no games yet).

## Files to change

- **DB migration**: backfill `games.team_id` and `pitch_code_map.team_id` for NULL rows → Unity 12u.
- **`src/hooks/useActiveTeam.ts`** → split into `ActiveTeamProvider` + `useActiveTeam` hook.
- **`src/routes/__root.tsx`** → wrap app in `ActiveTeamProvider`.
- **`src/routes/profile.tsx`** → expand Active Team card with roster + coaches lists.
- **`src/routes/teams.$teamId.tsx`** → add coaches list section above roster.
- **`src/components/TeamSwitcher.tsx`** → no logic change, just consumes the shared context.

## What you'll see after

- Click "Set active" on Unity 14u → header chip flips to "Unity 14u" instantly, profile card updates, Pitch Intel shows empty (clean slate for the weekend).
- Switch back to Unity 12u → all your existing scout notes, games, and pitch codes are right there.
- Each team's card shows only its own roster and coaches.
