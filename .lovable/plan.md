## Pitch Intel — Final Build Plan (approved refinements applied)

A new live pitch-calling module added inside Diamond Intel. Lives alongside Scout / Learning / Coach. Reuses existing `games`, `pitchers`, `opponents` tables. Adds 3 new tables for pitch code mapping and pitch-by-pitch logging.

---

### 1. Navigation & Routes

- **`BottomNav.tsx`**: add "Pitch" tab → `/pitch` (Target icon).
- **`src/routes/index.tsx`**: add a third ModeCard for Pitch Intel.
- **New routes** (TanStack file-based):
  - `pitch.tsx` — lobby (active Pitch Intel games + start new + link to code map)
  - `pitch.$gameId.tsx` — Live Logger
  - `pitch.$gameId.batter.$batterKey.tsx` — Batter Profile (3 tabs)
  - `pitch.codes.tsx` — Pitcher pitch-code map manager (Excel import/template)

---

### 2. Database Migration

`ALTER TYPE game_type ADD VALUE 'pitch';` plus 3 new tables:

- `pitch_types` — canonical pitch list per org (FBAWY, FBINS, …) seeded by app on first use.
- `pitch_code_map` — per-pitcher numeric_code → pitch_type_id.
- `pitch_entries` — one row per pitch with `balls_before/strikes_before/balls_after/strikes_after`, `result`, `spray_zone`, `contact_quality` (`weak`/`hard`/`barrel` only — no medium), `ab_result`, `at_bat_seq`, `pitch_seq`.

RLS mirrors existing patterns: org-scoped reads, `logged_by = auth.uid()` for inserts, coach-only update/delete on pitch_entries.

Indexes on `(game_id, batter_key, at_bat_seq, pitch_seq)`, `(batter_team, batter_number)`, `(pitcher_id, created_at)`.

---

### 3. Pitch Code Map Manager (`/pitch/codes`)

- Pick a pitcher (drawn from existing `pitchers` table, scoped to org games).
- Inline editor: numeric_code → pitch_type dropdown.
- **Download blank Excel template** (`.xlsx` via `xlsx` npm package) with example row + instructions.
- **Import** `.xlsx` / `.csv` → preview diff → bulk upsert.
- Manual add/edit/delete rows.

Adds dependency: `xlsx` (~600KB, pure JS, Worker-safe).

---

### 4. Live At-Bat Logger (`/pitch/$gameId`)

Mobile-first single screen:

```text
┌─────────────────────────────────────┐
│ Inning [2▼]  Pitcher: #14 Sara      │
│ ⚠ 72 pitches — RED                  │  ← Fatigue (§4a)
│ ⚠ 3 hard contact in last 6 hitters  │
├─────────────────────────────────────┤
│ Lineup: [#3][#7▶][#12][#22][+ Add]  │
├─────────────────────────────────────┤
│ Now batting: #7 BULLDOGS             │
│ ┌─ Last PA (1st inning) ──────────┐ │  ← Quick Banner (§4b)
│ │ FBAWY → CURVE → CHUPA           │ │
│ │ GO to SS · 🟢 weak              │ │
│ └─────────────────────────────────┘ │
│ Count B●●○○  S●○○ · PA: 3 · Tot: 47 │
├─────────────────────────────────────┤
│ Code [_ _ _] → "014" = FB Away      │
│ [Ball][C-Str][Sw-Str][Foul]         │
│ [In Play][HBP][Foul Tip K]          │
└─────────────────────────────────────┘
```

**4a. Pitcher Fatigue Bar** — top strip:
- 50–69 yellow · 70–84 red · 85+ critical
- Hard-contact streak: ≥3 hard/barrel in last 6 batters faced

**4b. Previous PA Quick Banner** — under "Now batting", visible without leaving the logger:
- Pitch sequence (translated codes) · ab_result · spray zone · 🟢/🔴 hard contact indicator
- Inning + game context. Empty state if first PA.

**4c. Lineup** — add-as-you-go + "Paste full lineup" modal.

**4d. Code entry & count engine** — pure function `countEngine.ts`:
- ball: +1 ball; 4 = walk
- called_strike / swinging_strike: +1 strike; 3 = K
- foul: +1 strike unless strikes=2
- foul_tip_caught: +1 strike (can be K)
- caught_foul: out
- in_play: opens spray chart → contact quality → ab_result
- hbp: ends PA

Inserts `pitch_entries` immediately via `useOfflineWriter` (offline-safe).

---

### 5. Spray Chart

SVG diamond modal on contact:
1. Tap zone (LF/CF/RF/SS/3B/2B/1B/P/C)
2. Contact quality: **Weak / Hard / Barrel** only
3. AB result chips

Reused as read-only dot map in Batter Profile. Colors: 🟢 out, 🟠 weak hit, 🔴 hard/barrel/XBH.

---

### 6. Batter Profile (`/pitch/$gameId/batter/$batterKey`)

Three tabs:
- **Current** — pitcher, count, pitch count, last PA, **Recommendation box** (§7).
- **Previous** — all historical PAs across org. Each row: date, game, pitcher, sequence, count, ab_result, spray.
- **Spray** — aggregated dots; pull% / oppo% / hard-contact zones.

---

### 7. Recommendation Engine (situation-aware, rules-based)

`recommend.ts` pure function. Inputs: `batter_key`, `pitcher_id`, current `(balls, strikes)`, all prior `pitch_entries`.

**7a. Situation classification** (`countSituation.ts`):
- `even` (0-0, 1-1) · `ahead` (0-1, 0-2, 1-2) · `behind` (1-0, 2-0, 2-1, 3-0, 3-1) · `full` (3-2) · `two_strike` (any X-2 except 3-2)

**7b. Sample cascade** — only score prior pitches in **comparable count situations**:
1. Same batter vs same pitcher in **same situation** → ×4
2. Same batter vs same pitcher in **any count** → ×2
3. Same batter vs any pitcher in **same situation** → ×2
4. Same team in **same situation** → ×1

**7c. Pitch scoring** — sum across filtered samples:
- +3 swinging_strike, +2 called_strike, +2 weak-contact out, +2 K
- −3 hard contact, −4 barrel, −5 XBH/HR

**7d. Situation-specific output:**
- `ahead` / `two_strike` — surface "Best chase pitch" first
- `behind` — surface "Strike pitch" first; de-prioritize walk-risk pitches
- `full` — avoid pitches with high ball% in batter history
- `even` — balanced top-2

Output: `{ situation, recommended[2], bestChase?, avoid[2], confidence }`.
Empty state (<3 prior pitches): "Not enough history — start with fastball away, see how she reacts."

---

### 8. File Map

**New libs:** `src/lib/pitchIntel/{types,countEngine,countSituation,fatigue,recommend,codeTemplate}.ts`

**New components:** `src/components/pitch/{PitchLobby,PitchGameSetup,LiveLogger,PitcherFatigueBar,PreviousPABanner,LineupStrip,CodeEntry,CountDisplay,ResultPad,SprayChart,BatterProfile,PreviousAtBats,RecommendationBox,PitchCodeMapEditor,PitchCodeImport}.tsx`

**New routes:** `src/routes/{pitch,pitch.$gameId,pitch.$gameId.batter.$batterKey,pitch.codes}.tsx`

**Edited:** `BottomNav.tsx`, `src/routes/index.tsx`

**Untouched:** Scout, Learning, Dashboard.

---

### 9. MVP Build Order

1. DB migration (via Lovable migration tool)
2. Core libs (types, countEngine, countSituation, fatigue, recommend, codeTemplate)
3. Routes scaffolding + nav + home card
4. Pitch Code Map editor + XLSX import/template
5. Live Logger with count engine + immediate inserts
6. Pitcher Fatigue Bar (50/70/85 + hard-contact streak)
7. Previous PA Quick Banner
8. Spray chart on contact (Weak/Hard/Barrel)
9. Batter Profile 3 tabs + situation-aware recommendations

Out of scope: AI recs, ump heat-map, velo/spin, video, PDF export.

Approve and I'll build it.