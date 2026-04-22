

# Phase 2 — Scout Mode (Revised)

Same scope as approved, with three changes folded in: full tag catalog, summary visible to all, per-player inning control.

## End-to-end flow

1. **Coach taps Scout** → if no active game, sees Game Setup. If a game is live for the org, jumps in.
2. **Game Setup** (coach only): opponent (autocomplete from `opponents`), game type, tournament name (optional), home/away, timed toggle + minute limit. Tap **Start Game** → `games` row, `status='active'`, `current_inning=1`.
3. **Active Game screen** — sticky header (score, timer, end-game). Four tabs: Observe, Pitcher, My Job, Steal It. Anyone in the org can add observations.
4. **Per-player inning** — each user's view tracks their *own* current inning locally (persisted in `localStorage` keyed by `gameId+userId`). Stepper `◀ Inning 3 ▶` is visible to **everyone** — players and coaches alike. Defaults to `games.current_inning` on first load.
5. **End Game** (coach only) → `status='completed'`, navigate to summary.

## Screens & components

### `/scout` — entry router
Reads org's active game. If active → `<ActiveGame />`. If none + coach → `<GameSetup />`. If none + player → empty state.

### `<GameSetup />` (coach only)
Form → upserts opponent → inserts game → replace-navigates to `/scout`.

### `<ActiveGameHeader />`
Sticky: home/away score (coach +/− buttons), timer (if timed), End Game button (coach only). **Inning stepper lives inside each tab's content area**, not the header, since it's now per-user.

### Tab 1: Observe
- **Per-user inning stepper** at top: `◀ Inning N ▶`. Anyone can advance/rewind their own view. Persists locally.
- **Team Tag Grid** — chips grouped by category (5 collapsible sections). Tap a chip = insert `scout_observations` row with `is_team_level=true`, `tags=[tag]`, `inning=<my current inning>`. Toast confirms.
- **Key Play note** — textarea + Save → row with `key_play` populated.
- **By-player observation** — jersey # + tag chips + optional note → row with `is_team_level=false`, `jersey_number`.
- **Recent observations** — last 10 from current game, grouped by inning.

### Tab 2: Pitcher
- List of pitchers for game. One marked active.
- Add Pitcher (jersey, name, notes) + "Set as active."
- Tap pitcher row to switch active.
- Quick observations: "Got tired", "Lost control", "Adjusting" with `pitcher_id` set.

### Tab 3: My Job
- Reads `game_assignments` for me + this game.
- If unassigned: chooser (Pitcher tendencies, 1B signs, 3B signs, Catcher pop time, Batting order, Defensive shifts, Bench chatter, Outfield arms).
- If assigned: shows assignment + reminder + shortcut to Observe.

### Tab 4: Steal It
- Wall of `scout_observations` where `steal_it IS NOT NULL` (this game + historical vs same opponent).
- Add Steal It form: free-text + optional tag → inserts with `steal_it` and `is_team_level=true`.

### `<GameSummary />` — `/scout/summary/$gameId`
**Visible to all org members** (players + coaches).
- Final score, opponent, date.
- Observations grouped by inning, team tags collapsed into counts ("Aggressive jumps ×4").
- Key plays as chronological list.
- Pitcher log per pitcher.
- Steal It wall (full).
- **Filtering**:
  - Coaches: see all observations from every org member, plus a small "current inning per player" panel showing each player's last-known inning view.
  - Players: see only rows where `player_id = auth.uid()`. Query is filtered at fetch time (RLS still permits read; we just narrow by `player_id` for player-role users).
- "Back to Home" button.

## Tag catalog (`src/lib/scoutTags.ts`)

Five categories with the full set you provided:

```ts
export const TAG_CATEGORIES = [
  { id: "pitching", label: "Pitching", tags: [
    "Rise ball", "Drop curve", "Change-up", "Fastball only",
    "Lost command", "Strong command", "Wild pitch", "Tipping pitches",
    "Same motion all pitches", "Effective change-up",
  ]},
  { id: "defense", label: "Defense", tags: [
    "Smart shift", "Covered the gap", "Great communication", "Cut-off perfect",
    "Weak arm in left", "Weak arm in center", "Weak arm in right",
    "Slow corners", "Diving stop", "Missed assignment",
  ]},
  { id: "offense", label: "Offense", tags: [
    "Patient at-bat", "First pitch hacker", "2-strike adjustment",
    "Pulls everything", "Goes oppo", "Bunt threat", "Slapper",
    "Free swinger", "K looking", "Good two-strike approach",
  ]},
  { id: "baserunning", label: "Base running", tags: [
    "Aggressive jumps", "Conservative baserunner", "Great reads",
    "Picked off", "Overran base", "Tagged up correctly",
    "Scores on wild pitches", "Soft on contact reads",
  ]},
  { id: "coaching", label: "Coaching", tags: [
    "Bunt-heavy coach", "Steal-happy", "Hit-and-run",
    "Frequent mound visits", "Aggressive pinch running",
    "Conservative substitutions", "Strong defensive adjustments",
  ]},
];
```

Tags are stored as their string label in `scout_observations.tags` (jsonb array). The Observe tab renders each category as a collapsible section with tap-to-tag chips.

## Offline queue + sync

Hybrid optimistic writes, unchanged from approved plan:
- `idb-keyval`-backed queue in `src/lib/offlineQueue.ts`.
- `useOfflineWriter()` hook: append to IDB → optimistic UI update → attempt insert → on success remove from queue, on failure leave queued.
- `window.online` listener + manual "Sync now" button flush the queue in order.
- Pending count badge in header when queue non-empty.

## Database

Schema already covers everything. **One small migration** for index performance:

```sql
CREATE INDEX IF NOT EXISTS idx_scout_obs_game_inning_created
  ON public.scout_observations (game_id, inning, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pitchers_game ON public.pitchers (game_id);
CREATE INDEX IF NOT EXISTS idx_games_org_status ON public.games (org_id, status);
```

No table changes, no RLS changes. Existing policies already allow:
- Org members read all observations for org games (player-level filter happens client-side for the summary).
- Players insert their own observations.

## Files to create

- `src/routes/scout.tsx` (replace stub)
- `src/routes/scout.summary.$gameId.tsx`
- `src/components/scout/GameSetup.tsx`
- `src/components/scout/ActiveGame.tsx`
- `src/components/scout/ActiveGameHeader.tsx`
- `src/components/scout/InningStepper.tsx` (per-user, localStorage-backed)
- `src/components/scout/ObserveTab.tsx`
- `src/components/scout/PitcherTab.tsx`
- `src/components/scout/MyJobTab.tsx`
- `src/components/scout/StealItTab.tsx`
- `src/components/scout/TeamTagGrid.tsx` (renders 5 categories from `scoutTags.ts`)
- `src/components/scout/ObservationList.tsx`
- `src/components/scout/GameSummaryView.tsx` (handles player-vs-coach filtering)
- `src/lib/scoutTags.ts`
- `src/lib/offlineQueue.ts`
- `src/hooks/useOfflineWriter.ts`
- `src/hooks/useActiveGame.ts`
- `src/hooks/useMyInning.ts` (reads/writes per-user current inning to localStorage)
- `supabase/migrations/<ts>_scout_indexes.sql`

## Tech notes

- TanStack Query for all reads, invalidated by writes.
- Supabase Realtime on `scout_observations` filtered by `game_id` so everyone sees new tags live.
- Tabs use existing shadcn `<Tabs>`. Tag chips minimum 44px tall.
- `useMyInning(gameId)` returns `[inning, setInning]`, persisted to `localStorage` under key `inning:${gameId}:${userId}`. Falls back to `games.current_inning` on first read.
- Game Summary uses role from `useAuth()` to decide whether to filter by `player_id`.

## Out of scope (deferred)

Learning Mode, Coach Dashboard analytics, Development Log, PDF export, Compare Opponents, voice-to-text, photo/video attachments.

