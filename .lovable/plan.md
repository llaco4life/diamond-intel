## Problem

On the pitch tracking screen the batter shows as `#?` and the team appears lowercase (`· canes`) instead of `#24 Makayla · Canes`. The lineup row from the Lineup screen never resolves.

## Root cause

`makeBatterKey(team, jersey)` in `src/lib/pitchIntel/types.ts` lowercases the team:

```ts
return `${team.trim().toLowerCase()}:${jersey.trim()}`;
```

So the link built in `pitch.$gameId.tsx` and `NextBatterBanner.tsx` produces a URL like `canes:slot:<id>`. In `pitch.$gameId.batter.$batterKey.tsx`:

```ts
const batterTeam = parts[0]; // "canes"  (lowercased)
const { lineup } = usePitchLineup(gameId, batterTeam);
```

But the lineup was saved under the original case (`Canes`) in both `localStorage` (`pitch-lineup:<gameId>:Canes`) and in `pitch_lineups` (`team = 'Canes'`). The query returns nothing, `slot` is `null`, so `jersey` falls back to `"?"` and the heading renders `· canes`.

## Fix

In `src/routes/pitch.$gameId.batter.$batterKey.tsx`, resolve the URL's lowercased team back to the game's actual cased team name once the game loads, then use that resolved value for every downstream hook and label.

1. Keep `const urlTeam = parts[0]` (lowercase from URL).
2. After `game` loads, derive:
   ```ts
   const batterTeam = useMemo(() => {
     if (!game) return urlTeam;
     if (game.away_team.toLowerCase() === urlTeam) return game.away_team;
     if (game.home_team.toLowerCase() === urlTeam) return game.home_team;
     return urlTeam;
   }, [game, urlTeam]);
   ```
3. Replace every existing `batterTeam` usage with the new memoized value (it's already named `batterTeam` — just swap the source). That covers:
   - `usePitchLineup(gameId, batterTeam)` → now finds the lineup row
   - `useCurrentBatter(gameId, batterTeam, lineup.length)`
   - `useOpponentHistory(..., batterTeam, ...)`
   - The `keys.add(makeBatterKey(batterTeam, ...))` set for entry matching (still works — `makeBatterKey` lowercases on both sides)
   - `batter_team: batterTeam` on insert (now stores correct case, consistent with existing data)
   - The header text `· {batterTeam}` (now shows `· Canes`)
   - `advanceHalfInning` comparison against `game.away_team`
4. While `game` is still loading, the existing "Loading game…" early return already prevents rendering the header, so the lowercase fallback is invisible to the user.

No schema changes, no other files touched. This is a single-file, presentation/data-resolution fix.

## Out of scope

- Changing `makeBatterKey` to preserve case (would break existing stored `batter_key` values in `pitch_entries`).
- Reworking lineup storage to be case-insensitive.
