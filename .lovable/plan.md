

# At-Bat Logging Upgrade — Final Plan

## Schema migration

```sql
ALTER TABLE public.at_bats
  ADD COLUMN batter_number text,
  ADD COLUMN batter_team text CHECK (batter_team IN ('my_team','opponent')),
  ADD COLUMN pitch_counts jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(pitch_counts) = 'object');
```

All three columns nullable/defaulted so legacy rows remain valid. `pitches_seen` kept for back-compat reads.

## Storage shape

`pitch_counts` is a flat JSONB object keyed by canonical pitch slug, only non-zero entries saved:

```json
{ "fastball": 3, "change_up": 1, "rise_ball": 2 }
```

## New file

**`src/lib/pitchTypes.ts`** — single source of truth for pitch slug ↔ label.

## File edits

**`src/components/learning/AtBatLogButton.tsx`**
- Add **Batter #** numeric input (`inputMode="numeric"`).
- Add **Team** segmented toggle: `My Team` / `Opponent`. No default — user must pick.
- Replace pitches-seen text input with **PitchCounter list**: each row = label, `−`, count, `+`. Min 0. 44px tap targets.
- Keep Notes textarea (placeholder mentions sequence/location).
- **Save validation (new requirement):** Save button disabled until `batter_number.trim() !== ""` AND `batter_team` is set. On submit, double-check and toast an error if missing.
- Write `batter_number`, `batter_team`, `pitch_counts` (non-zero entries only), `notes`. Do not write `pitches_seen`.
- Recent-list inside the sheet renders the new fields using actual team names (see below).

**`src/components/learning/LearningSummaryView.tsx`**
- Accept/derive `home_team` and `away_team` from the session's `games` row (already loaded for the header).
- For each at-bat row render: `Inning N · #BatterX · {batter_team === 'my_team' ? home_team : away_team}`.
- Below 1–5 scores, render pitch counts as inline chips: `Fastball ×3 · Change-up ×1`.
- Legacy rows: if `pitch_counts` empty and `pitches_seen` text present, fall back to that text. If `batter_team` is null, show no team label (don't fabricate).
- Notes line unchanged.

**`src/components/learning/AtBatLogButton.tsx`** recent list also uses `home_team`/`away_team` passed in as props from `ActiveLearningSession`.

## Prop wiring

`ActiveLearningSession` already loads the game row → pass `homeTeam` and `awayTeam` down to `AtBatLogButton`. `LearningSummaryView` already fetches the game → reuse those fields.

## Untouched

Scout Mode, observation flow, Steal It, RLS, offline queue, summary structure outside the at-bat list.

## Files

- migration: 3 new columns on `at_bats`
- new: `src/lib/pitchTypes.ts`
- edit: `src/components/learning/AtBatLogButton.tsx`
- edit: `src/components/learning/ActiveLearningSession.tsx` (pass team names through)
- edit: `src/components/learning/LearningSummaryView.tsx` (at-bat block + team name rendering)

