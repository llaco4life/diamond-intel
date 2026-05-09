Combined implementation of both approved features.

## Feature A — Tap buttons for pitch types (alternative to numeric codes)

### Schema
- `teams.pitch_entry_mode` text NOT NULL DEFAULT `'numeric_codes'`, CHECK in (`numeric_codes`, `tap_buttons`, `both`).

### UI
- New `src/components/pitch/PitchTypePad.tsx` — grid of buttons, one per `pitch_types` row for the active team. Selecting highlights and stores `pitch_type_id` in local state; cleared after each logged pitch.
- `src/routes/pitch.codes.tsx` — add a mode selector (radio: numeric codes / tap buttons / both) at top, persisted to `teams.pitch_entry_mode`.
- `src/routes/pitch.$gameId.batter.$batterKey.tsx` — branch on team mode:
  - `numeric_codes` → today's `CodeEntry` only.
  - `tap_buttons` → `PitchTypePad` only.
  - `both` → both stacked.
- `logPitch()` resolves `pitch_type_id` from tapped button first, then code-map lookup, else null.
- Empty state in tap mode if team has no pitch types: link to `/pitch/codes`.
- `useActiveTeam` returns `pitch_entry_mode` on the active team object.

## Feature B — 3×3 pitch location grid (zones 1–9)

### Schema
- `pitch_entries.pitch_location` smallint nullable, CHECK between 1 and 9.
- `pitch_entries.batter_hand` text nullable (`'R' | 'L' | 'S'`).

### UI
- New `src/lib/pitchIntel/pitchZones.ts` — `zoneLabel(zone, hand)` returning e.g. `"high inside"` / `"high away"`, mirrored for LHH.
- New `src/components/pitch/PitchLocationGrid.tsx` — 3×3 of large thumb-tap squares numbered 1–9 (top-left → bottom-right). Selecting highlights; tapping again clears. Sub-label under each number reflects hand.
- `src/routes/pitch.$gameId.batter.$batterKey.tsx`:
  - Add R / L / S handedness toggle near the batter header (defaults to last-used for that batter, stored locally).
  - Render `PitchLocationGrid` between pitch-type entry and `ResultPad`.
  - Include `pitch_location` + `batter_hand` in the `pitch_entries` insert.
  - Clear selection after each logged pitch.
  - Show zone in "This PA pitch log" lines: `1. 0-0 → ball (1-0) · zone 3`.
- `src/lib/pitchIntel/types.ts` — extend `PitchEntryRow` with the two new fields.

### Out of scope (both)
- Heatmap visualizations, zone-aware recommendations, per-pitcher tendencies — leave columns available for a follow-up.
- No changes to spray chart (`spray_zone` is unrelated batted-ball field).
- No per-pitcher tap-mode override (team-level only).

### Migration order
1. Run combined SQL migration (both column adds + the teams column).
2. Implement components and route changes in one pass.
