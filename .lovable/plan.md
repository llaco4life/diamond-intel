

# Learning Mode v1 — Final Plan (revised)

Personal-session focused. Reuses Scout Mode building blocks. No new migrations tonight.

## Schema verification — `at_bats` is clean

Confirmed against the live schema:

| Field requested | Column on `at_bats` | Type | Nullable |
|---|---|---|---|
| confidence | `confidence_level` | integer | No |
| execution | `execution` | integer | No |
| mental focus | `mental_focus` | integer | No |
| pitches seen | `pitches_seen` | text | Yes |
| notes | `notes` | text | Yes |

Plus `game_id`, `player_id`, `inning`, `created_at`. RLS already enforces `player_id = auth.uid()` and that the parent game belongs to the user's org. **All five fields are supported natively — we will use `at_bats` directly. No workaround needed.**

## "My Team" — no auto-fill from org.name

`LearningSetup` will include a **My Team** input:
- Empty by default (placeholder: "e.g. Unity Perez 14U")
- Saved to `games.home_team`
- `games.away_team` falls back to the opponent input, or to the context label ("Live Practice" / "Scrimmage" / "Watching") when no opponent is given
- `org.name` is **not** referenced in the Learning setup flow

## 1. Reused from Scout Mode (no rebuild)

| Component | Reused as-is |
|---|---|
| `InningStepper` | Inning navigation |
| `TeamTagGrid` + `scoutTags.ts` | Quick observation tags |
| `getCategory` / `resolveAppliesTo` | Offense/defense routing |
| `useOfflineWriter` | All writes |
| `useMyInning` | Per-user inning persistence |
| Sticky header pattern from `ActiveGameHeader` | Adapted for session header |
| `Sheet`, `Textarea`, `Input`, `Button`, `Label`, `Slider` | UI primitives |

## 2. New Learning components

```
src/routes/learning.tsx                     (replace stub: lobby ↔ setup ↔ active)
src/routes/learning.summary.$sessionId.tsx  (mirrors scout.summary)
src/components/learning/
  LearningLobby.tsx                  Start session + recent ended sessions (filtered to created_by = me)
  LearningSetup.tsx                  My Team, opponent, context, date, optional timer
  ActiveLearningSession.tsx          Header + 3 tabs: Observe / Steal / At-Bats
  LearningSessionHeader.tsx          Sticky: context label, inning, optional timer, End Session
  MissionCard.tsx                    Green-tint; cycles 7 missions by inning
  LearningObserveTab.tsx             Mission card + offense toggle + TeamTagGrid + Key Play
  LearningStealTab.tsx               Pink card; textarea-only
  AtBatLogButton.tsx                 Floating FAB + modal (confidence/execution/mental_focus 1-5, pitches_seen, notes)
  LearningSummaryView.tsx            Observations grouped by inning + steal-it list + at-bat list
```

## 3. Data model — reuse existing tables, zero migrations

| Concept | Table | How |
|---|---|---|
| Session | `games` | `game_type='learning'`, `home_team`=My Team input, `away_team`=opponent or context label, `tournament_name`=context type, `created_by`=user, `status`=active/ended |
| Observations | `scout_observations` | Filtered to `player_id = auth.uid()` everywhere in Learning |
| Steal It | `scout_observations.steal_it` | Textarea-only row, `is_team_level=true`, `tags=[]` |
| At-Bat reflections | `at_bats` | Direct write, all 5 fields native |

## 4. At-Bat save path

```ts
useOfflineWriter().write("at_bats", {
  game_id, player_id, inning,
  confidence_level, execution, mental_focus,   // 1-5 sliders
  pitches_seen,                                // text
  notes                                        // text
});
```

Multiple logs per session allowed. Offline queue + retry handled by existing hook.

## 5. Steal It → future development tracking

Stored on `scout_observations.steal_it` tonight. The `development_items` table already has `source_game_id` and `source_note` columns — the future Development Log feature will convert any steal_it row into a `development_items` row by copying these fields. Nothing required tonight beyond writing to `steal_it`.

## 6. Mission cycle

```ts
const MISSIONS = [
  "Watch the pitcher", "Study the catcher", "Defense positioning",
  "Base running", "Hitting approach", "Coaching decisions", "Pressure moments",
];
const mission = MISSIONS[(inning - 1) % 7];
```

## 7. Offense/defense

Single toggle: defaults to `away_team` on offense (you're usually watching "them"). Flips to put `home_team` (My Team) on offense. Coaching tags still trigger the existing offense/defense bottom-sheet prompt.

## 8. End Session

Header button → `update games set status='ended'` → navigate to `/learning/summary/$sessionId` → render observations grouped by inning, steal-it list, and at-bat list.

## Intentionally out of scope tonight

- No `development_items` writes (stays in `scout_observations.steal_it`)
- No coach dashboards for learning sessions
- No shared/multi-user learning sessions, no Join flow
- No PDF, charts, compare-sessions
- No new migrations, no RLS changes
- No realtime subscriptions on learning sessions
- No `Pitcher` / `My Job` tabs, no opponent linkage to past games
- No bottom-nav changes

## File summary

- **Create:** 9 files in `src/components/learning/` + `src/routes/learning.summary.$sessionId.tsx`
- **Replace:** `src/routes/learning.tsx` (currently a stub)
- **Touch nothing in Scout Mode.** Zero migrations.

