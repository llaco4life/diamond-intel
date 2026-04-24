# My Job Tab — Assignment-Specific Tracking Center (SHIPPED)

Approved with refinements:
- Removed "Pitcher tendencies" entirely from `ASSIGNMENT_OPTIONS` — pitching lives in Pitcher tab only.
- Strengthened "Batting order" chip set: leadoff aggressive, auto-take first pitch, free swinger, power pocket 3-5, bottom weak, lineup flipped.
- Future: optional "Must Know" priority marker for top assignment notes.

# Coach Dashboard V1 — War Room (SHIPPED)

Approved with refinements:
- Pin to Top 5 included in V1 (manual coach override; pinned items always rank first; visually marked with amber border + 📌 badge).
- "Pitching" Attack Plan bucket renamed to "Our Pitching Plan".
- Confidence labels (High / Medium) on every Must Know card.
- Pins are scoped to `game_id` only — opponent-level pinning deferred.

## Sections (top → bottom)
1. Top 5 Must Know (pinned-first, scored, confidence chip, pin/unpin)
2. Attack Plan — Offense / Our Pitching Plan / Defense / Baserunning
3. Pitcher Breakdown — auto-generated Coach Call line per pitcher
4. Role Intel — `applies_to_team = job:*` grouped by assignment
5. Steal It Wall — top 3 + View all toggle
6. All raw observations — collapsed `<details>`

## Implementation
- Migration: `pinned_must_know` table (game-scoped, RLS coach-only insert/delete).
- `src/lib/dashboardIntel.ts` — `computeMustKnow`, `computeAttackPlan`, `computePitcherCall`, `computeRoleIntel`, `TAG_TO_ACTION`, `HIGH_VALUE_TAGS`.
- `src/components/dashboard/ScoutingReportView.tsx` — full rewrite as War Room.
