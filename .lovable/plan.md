# Pitch Intel — Game Flow Upgrade

## 1. Fix batter card tap (root cause)

In `src/routes/pitch.$gameId.tsx`, the batter card wraps the main row in a `<Link>` and places Edit/Sub/Remove buttons in a *sibling* footer. That works on desktop, but the footer buttons sit visually inside the same "card" and on touch devices the large card area can feel unresponsive due to the `active:scale-[0.99]` only applying on the inner Link, plus nested interactive regions cause hit-target ambiguity.

Fix:
- Convert the whole card (`<div>` wrapper) into a single `<Link>` block that fills the card, with `to="/pitch/$gameId/batter/$batterKey"` and `params={{ gameId, batterKey: encodeURIComponent(slotKey) }}`.
- Render Edit / Sub / Remove buttons as overlaid action buttons at the right side, each calling `e.preventDefault(); e.stopPropagation();` in their `onClick` so they never trigger navigation.
- Verify the `slotKey` continues to round-trip through TanStack params (team names with spaces already work, as `Route.useParams()` decodes once).

## 2. Pitcher management parity with batters

Create a new lightweight `usePitchers(gameId)` hook OR keep the inline pitcher state but add full CRUD against the `pitchers` table:
- **Add** — already exists; keep.
- **Edit** — open a dialog (reuse pattern from `BatterEditDialog`) to edit jersey + name + notes; `UPDATE pitchers SET ...`.
- **Remove** — confirm dialog ("Remove pitcher? Their logged pitches stay in history."), then `DELETE FROM pitchers WHERE id=...`. Pitch entries reference `pitcher_id` as text/uuid but have **no FK**, so deletes won't cascade — history is preserved.
- **Substitute / change current** — single `UPDATE` flipping `is_active` flags. New pitcher becomes active; old one stays in the dropdown so historical entries remain attributable. The existing `switchPitcher` already handles this; expose it in the new compact UI.

New component: `src/components/pitch/PitcherManagerDialog.tsx` — list of pitchers with inline edit / delete / "Make active" actions plus an "Add pitcher" form.

## 3. Compact scoreboard banner

Add `src/components/pitch/ScoreboardBanner.tsx` rendered at the top of `pitch.$gameId.tsx`:

```text
┌─────────────────────────────────────────────┐
│ Top 3rd · 1 out                             │
│ Unity 2  —  Bulldogs 1     [-][+] [-][+]    │
│ P: #22 Sara · 41 pitches                    │
└─────────────────────────────────────────────┘
```

Data:
- `home_team`, `away_team`, `home_score`, `away_score`, `current_inning` from `games`.
- Top/bottom of inning derived from `batterTeam === away_team ? "Top" : "Bottom"`.
- Outs: stored locally in component state (no DB column); resets when inning changes. (We can revisit persistence later.)
- Active pitcher + pitch count from existing data.

Score editing: small `+` / `-` buttons next to each score, calling `UPDATE games SET home_score / away_score`.

## 4. Next-batter banner

Add `src/components/pitch/NextBatterBanner.tsx` under the scoreboard:

```text
At bat:   #7 Smith
On deck:  #12 Jones
In hole:  #24 Emma
```

Logic:
- Track `currentBatterIndex` in component state on the game screen, persisted to `localStorage` under `pitch-current-batter:${gameId}:${team}`.
- `current = lineup[idx]`, `next = lineup[(idx+1) % len]`, `onDeck = lineup[(idx+2) % len]`.
- Tapping the banner navigates to current batter's profile (same Link target as the card).

## 5. End At-Bat / Next Batter advance

In `pitch.$gameId.batter.$batterKey.tsx`:
- Add an "End at-bat → next batter" button that appears once the active PA has an `ab_result` recorded (i.e. spray/AB picker has resolved). Already implicit when `activePa` becomes complete.
- On click:
  - Bump the lineup pointer in `localStorage` (`(idx + 1) % lineup.length`).
  - Navigate back to `/pitch/$gameId` (lineup screen) **or** directly into the next batter's profile — choose direct navigation for speed.
- Also show a passive "✓ At-bat saved — tap to advance to #X" banner once the PA is complete, so the coach has one obvious next step.

Expose a tiny shared helper `src/hooks/useCurrentBatter.ts`:

```ts
export function useCurrentBatter(gameId, team, lineupLength) {
  // reads/writes localStorage index, returns { index, advance, setIndex }
}
```

Used by both the game screen banner and the batter screen advance button so they stay in sync.

## Files to create / edit

**New:**
- `src/components/pitch/ScoreboardBanner.tsx`
- `src/components/pitch/NextBatterBanner.tsx`
- `src/components/pitch/PitcherManagerDialog.tsx`
- `src/hooks/useCurrentBatter.ts`

**Edit:**
- `src/routes/pitch.$gameId.tsx` — make whole card tappable with overlaid action buttons; mount scoreboard + next-batter banners; replace inline pitcher add UI with a "Manage pitchers" button opening the new dialog.
- `src/routes/pitch.$gameId.batter.$batterKey.tsx` — add "End at-bat / next batter" CTA wired to `useCurrentBatter`.

## Out of scope (not requested)

- Persisting outs/balls/strikes server-side across reloads (kept local for now).
- Adding new database columns. The plan reuses `games.home_score`, `games.away_score`, `games.current_inning`, and the existing `pitchers` and `pitch_entries` tables — **no schema changes**.

Ready to implement on approval.