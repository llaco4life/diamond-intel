

# Pitcher Intelligence — Final Plan

## Schema migration

```sql
ALTER TABLE public.pitchers
  ADD COLUMN team_side text CHECK (team_side IN ('my_team','opponent'));
```

Nullable so existing Scout-mode rows remain valid. No RLS changes. `types.ts` regenerates.

## New file

**`src/components/learning/CurrentPitcherBar.tsx`**
- Slim bar: "Pitching: [#22 · Opponent ▼]  [+ New pitcher]"
- Dropdown lists pitchers for current `game_id` (label format `#<jersey> · <team name>` using `homeTeam`/`awayTeam` props).
- "+ New pitcher" opens a sheet:
  - **Jersey #** numeric input (required)
  - **Team** segmented toggle: `My Team` / `Opponent` (required)
  - Save disabled until both set.
- **Duplicate guard (new):** before insert, query `pitchers` where `game_id = X AND jersey_number = Y AND team_side = Z`. If a match exists, toast `"Pitcher already exists — selected"` and set it as current instead of inserting. Otherwise insert via `useOfflineWriter` and select on success.
- Offline note: when the writer queues the insert (offline), skip the duplicate check (we cannot trust local state for sync conflicts) and rely on the user to pick from the list once online. The bar shows the queued pitcher optimistically in local state.

## File edits

**`src/components/learning/LearningObserveTab.tsx`**
- Mount `CurrentPitcherBar` under the offense toggle. Lift `currentPitcher` (id + jersey) into state.
- In `onPickTag`: when `categoryId === "pitching"`, require `currentPitcher`. If missing, toast `"Pick or add the current pitcher first"` and abort.
- For pitching writes, include on the `scout_observations` row:
  - `pitcher_id: currentPitcher.id`
  - `jersey_number: currentPitcher.jersey_number` (denormalized for fast summary reads)
  - `is_team_level: false`
  - `applies_to_team` resolved as today (defense side)
- Non-pitching tags unchanged.

**`src/lib/scoutTags.ts`**
- Export `PITCHING_TAG_SET: Set<string>` derived from the existing Pitching category, for the summary filter. No behavior change.

**`src/components/learning/LearningSummaryView.tsx`** — add Pitcher Summary section between "Steal It" and "At-bat log":
- Extend the `scout_observations` select to include `pitcher_id, jersey_number`.
- Fetch `pitchers` where `game_id = sessionId` (parallel with existing queries).
- Build per-pitcher rollup:
  1. Filter observations where `pitcher_id IS NOT NULL` AND tag ∈ `PITCHING_TAG_SET`.
  2. Aggregate tag counts per `pitcher_id`.
  3. For at-bat pitch counts: opposing `team_side` = `'opponent'` if `batter_team === 'my_team'` else `'my_team'`. If exactly one pitcher in this session has that `team_side`, attribute `pitch_counts` to them. Otherwise skip and show disclaimer.
  4. Render one card per pitcher: `#22 · {team name}` + observation tag chips + at-bat pitch chips (labeled "from at-bats").
- Disclaimer line if any at-bats were skipped: "Some at-bat pitch counts not attributed — multiple pitchers seen for that team."
- Empty state if no pitchers: "No pitchers identified this session. Add the current pitcher in Observe to enable pitcher rollups."

## Untouched

Scout Mode (PitcherTab keeps working — `team_side` is nullable), Steal It, At-Bat modal, RLS, observation flow outside pitching tags, offline queue (`pitchers` already in `QueuedTable`).

## Files

- migration: 1 column on `pitchers`
- new: `src/components/learning/CurrentPitcherBar.tsx`
- edit: `src/components/learning/LearningObserveTab.tsx`
- edit: `src/components/learning/LearningSummaryView.tsx`
- edit: `src/lib/scoutTags.ts`

