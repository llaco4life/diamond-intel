

# Learning Mode V2 — Approved, Ready to Build

Plan is locked. Build proceeds in the next (default-mode) turn. Two approved refinements folded in:

## Refinement 1 — Suggest (don't auto-select) top active goal in PrepView

`PrepView` loads the player's most recent `development_items` row where `status = 'working_on'` (ordered by `updated_at desc`, limit 1). Its `source_note` is rendered as a **"Suggested from your active goal"** chip above the preset focus list. Tapping it adds it to the focus selection (subject to the max-2 cap). It is **not pre-checked** — the player chooses.

If no active goal exists, the suggestion slot is hidden entirely.

## Refinement 2 — Rename discussion (post-build)

"Learning Mode" → "Player Development" / "Development Mode" is captured as a **follow-up task after this build ships**, not part of this build. Rationale: the rename touches lobby, nav, route paths (`/learning` → `/development-mode`?), summary route, and copy across ~8 files, and it would collide with the existing `/development` stub route. Worth a dedicated pass so we can think through the route naming (e.g. merge `/development` into the new mode, or keep them separate) instead of bolting it onto the V2 build.

I'll open a separate plan for the rename once V2 is live and you've used it for a session or two.

## Build scope (unchanged from approved plan)

- **Migration**: add `learning_phase text` + `learning_focuses text[]` to `games`; backfill existing learning sessions to `learning_phase = 'live'`.
- **Phase router** in `ActiveLearningSession`: `prep | live | reflect | develop | ended`.
- **New views** under `src/components/learning/v2/`: `PrepView`, `LiveQuickView`, `ReflectView`, `DevelopView`.
- **PrepView**: focus picker (max 2, preset + custom), suggested-goal chip (see Refinement 1), pre-game Diamond Decisions at `inning = 0`, optional pitcher-tracking toggle.
- **LiveQuickView**: slimmed Observe — focus banner, Quick Tags, Steal It, small inning dropdown, "End game → Reflect" CTA. No MissionCard, no in-game Diamond Decisions, no floating AtBat button.
- **ReflectView**: at-bat reflection form (reusing `at_bats`), "What should I steal?" writes to `scout_observations.steal_it`, post-game Diamond Decisions at `inning = 99`.
- **DevelopView**: surface reflection answers as suggested goals → one-tap insert into `development_items` with `source_game_id`, `source_note`, `status = 'working_on'`.
- **Lobby updates**: CTA → "Start Pre-Game Prep"; new "Awaiting reflection" and "Active development goals" sections.
- **LearningSetup**: creates session with `learning_phase = 'prep'` and empty `learning_focuses`.
- **LearningSummaryView**: relabel inning `0` as "Pre-game", `99` as "Post-game reflection"; show focuses.
- **`src/lib/diamondDecisions.ts`**: add `prep:*` and `reflect:*` prompt sets.

## Untouched

Scout Mode, `scout_observations` / `at_bats` / `diamond_decision_responses` / `development_items` schemas, forgot-password, swap home/away, delete-game, shared `TeamTagGrid` / `ObservationList`.

## Out of scope for this build

- Rename to "Player Development" (follow-up plan).
- Coach review of reflections.
- Goal analytics / streaks.
- Auto-ML focus suggestions (we surface the most recent active goal only, per Refinement 1).

