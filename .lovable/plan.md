

# Scout Mode — Team Context for Observations (Revised)

Same plan as approved, with two corrections to coaching labels and default-team logic.

## Schema change

Add one nullable column to `scout_observations`:

- `applies_to_team text` — the team the observation describes (offense or defense team name).

Nullable so existing rows stay valid. New writes always populate it. No backfill, no RLS changes.

## Category → team mapping (`src/lib/scoutTags.ts`)

| Category     | Default applies to       |
|--------------|--------------------------|
| Pitching     | defense_team             |
| Defense      | defense_team             |
| Offense      | offense_team             |
| Base running | offense_team             |
| Coaching     | ask (offensive vs defensive coaching) |

Each `TagCategory` gains `defaultAppliesTo: "offense" | "defense" | "ask"`. Helper `resolveAppliesTo(categoryId, offenseTeam, defenseTeam)` returns the correct team name (or `null` for `ask`).

## Coaching prompt (REVISED — adjustment 1)

When a Coaching chip is tapped, open a small bottom sheet with two large buttons labeled by **role**, not home/away:

- **Offensive Coaching** — *[offense team name]*
- **Defensive Coaching** — *[defense team name]*

One tap dismisses the sheet, sets `applies_to_team` to the corresponding team, and saves. Sheet copy: "Whose coaching are you tagging?"

## Key Play / By-Player default (REVISED — adjustment 2)

These forms get a small segmented control: `Applies to: [Offense] [Defense]`. The default is **context-aware**, not always offense:

- Triggered from a Pitching/Defense category context → default **defense**
- Triggered from an Offense/Base running category context → default **offense**
- Triggered from Coaching context → no default; user must pick (same prompt as coaching tags)
- Standalone (no category context — the plain Key Play card and the By-player card at the bottom of the Observe tab) → default **offense**

Implementation: `ObserveTab` tracks a `lastCategoryContext` set whenever a chip is picked from `TeamTagGrid`. The Key Play and By-player forms read this when they mount/render their segmented control's default. User can override with one tap before saving.

## Observe tab UI

Replace current "On offense" row with a context card showing both sides:

```text
┌─────────────────────────────────────────┐
│  ON OFFENSE          ON DEFENSE         │
│  [ Away Team ✓ ]     Home Team          │
│  [ Home Team   ]     Away Team          │
└─────────────────────────────────────────┘
```

Tapping a team in the offense column flips both sides instantly.

Each collapsible category in `TeamTagGrid` gets a small badge in its header:

- "Pitching · evaluating *Home Team*"
- "Defense · evaluating *Home Team*"
- "Offense · evaluating *Away Team*"
- "Base running · evaluating *Away Team*"
- "Coaching · choose when tagging"

Badges update live when offense flips.

## Recent observations

`ObservationList` adds a small team chip per row (offense = `primary-soft`, defense = `muted`). Rows with null `applies_to_team` show "—".

## Components changing

- `src/lib/scoutTags.ts` — add `defaultAppliesTo` per category, export `resolveAppliesTo()` helper.
- `src/components/scout/ObserveTab.tsx` — new context card; track `lastCategoryContext`; coaching prompt sheet with **Offensive/Defensive Coaching** labels; context-aware default on Key Play and By-player segmented controls.
- `src/components/scout/TeamTagGrid.tsx` — accept `offenseTeam` + `defenseTeam` props; render evaluation badge per category header; `onPick` signature becomes `(tag, categoryId)`.
- `src/components/scout/ObservationList.tsx` — render team chip per row.
- `src/components/scout/GameSummaryView.tsx` — split tag counts by `applies_to_team` (e.g., "Aggressive jumps ×3 vs Home, ×1 vs Away"); legacy null rows grouped under "Unspecified team".
- Migration file: add `applies_to_team` column.

## Summary/report compatibility

- Legacy rows (no `applies_to_team`) render under "Unspecified team" subgroup — nothing breaks.
- Steal It wall and key plays display the team chip when present.
- Pitcher tab quick-observations auto-set `applies_to_team = defense_team` on write — no UI change there.

## Offline queue

`useOfflineWriter` is payload-agnostic; new field flows through automatically. No changes.

## Out of scope

- Editing or backfilling old observations.
- Per-tag (not per-category) overrides.
- Changing Pitcher tab UI.

