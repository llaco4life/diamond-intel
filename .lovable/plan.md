# My Job Tab — Assignment-Specific Tracking Center (SHIPPED)

Approved with refinements:
- Removed "Pitcher tendencies" entirely from `ASSIGNMENT_OPTIONS` — pitching lives in Pitcher tab only.
- Strengthened "Batting order" chip set: leadoff aggressive, auto-take first pitch, free swinger, power pocket 3-5, bottom weak, lineup flipped.
- Future: optional "Must Know" priority marker for top assignment notes.

## Implementation

- `src/lib/scoutTags.ts`: rebuilt `ASSIGNMENT_OPTIONS`, added `ASSIGNMENT_TAG_CATALOG` + `getAssignmentChips()`.
- `src/components/scout/MyJobTab.tsx`: full rewrite — picker → assignment-specific workspace with quick chips, pattern note input, recent entries (delete in edit mode), realtime subscribe. No "Go to Observe" redirect.
- `src/components/scout/ActiveGame.tsx`: passes `defaultInning`, drops `onGoToObserve` prop.
- `src/components/scout/GameSummaryView.tsx`: new "Assignment notes" section, grouped by assignment, with chip counts and chronological notes. Inning observations now exclude `job:*` rows.

## Data model

Reuses `scout_observations` with `applies_to_team = "job:<assignment>"` sentinel. Tags = chip labels, `key_play` = free-text pattern note. Existing RLS allows player delete.
