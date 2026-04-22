

# Confirmation: Shared Game Tracking does not touch prior Scout Mode fixes

I reviewed every file in the upcoming build against the list. None of the previously completed Scout Mode work is modified, removed, or indirectly affected.

## Item-by-item confirmation

| Prior fix | File(s) | Touched by this build? |
|---|---|---|
| `home_team` / `away_team` inputs in GameSetup | `src/components/scout/GameSetup.tsx` | **No.** Only the submit handler is modified — pre-insert recheck for an active scout game + `23505` fallback. The form fields, labels, defaults (org name → home_team), and validation are untouched. |
| `opponent_id` saved on scout game creation | `src/components/scout/GameSetup.tsx` | **No.** The opponent lookup-or-insert block and the `opponent_id` field on the `games` insert payload stay exactly as they are. |
| Offensive / defensive context in Observe tab | `src/components/scout/ObserveTab.tsx` | **Not opened.** Not in the file list for this build. |
| `applies_to_team` logic | `src/lib/scoutTags.ts`, `ObserveTab.tsx`, `StealItTab.tsx` | **Not opened.** No tag resolution code is touched. |
| Key Play wording update | `ObserveTab.tsx` / observation list | **Not opened.** |
| By Player team-first selector | `src/components/scout/TeamTagGrid.tsx` / observation flow | **Not opened.** |
| Coach Dashboard `opponent_id`-based grouping | `src/components/dashboard/OpponentList.tsx`, `ScoutReportsTab.tsx` | **Not opened.** Dashboard queries are unchanged. The new partial unique index is scoped to `status='active' AND game_type='scout'`, so ended games (which is all the dashboard reads) are unaffected. |

## Files this build will modify (scope is strictly additive)

- `src/components/scout/ActiveGameHeader.tsx` — wrap the existing end-game update with `.select().single()` verification + busy state. No score/header UI changes.
- `src/routes/scout.tsx` — three-state flow (Lobby → Setup, or ActiveGameCard → ActiveGame). The existing `<ActiveGame>` component is rendered unchanged once the user clicks Join.
- `src/components/scout/GameSetup.tsx` — submit handler only: pre-insert recheck (Scout games only) + `23505` catch. Form, fields, opponent linkage, and `opponent_id` write are preserved verbatim.

## Files this build will create

- `src/components/scout/ActiveGameCard.tsx` — confirmation card with deduped tracking count.
- `src/components/scout/GameLobby.tsx` — empty-state landing.

## Migration

- `CREATE UNIQUE INDEX games_one_active_scout_per_org ON public.games (org_id) WHERE status = 'active' AND game_type = 'scout';`
- Scoped to scout games only, so Learning sessions remain unconstrained. No column changes, no RLS changes, no trigger changes.

## Net answer

None of the seven items on your list are modified, directly or indirectly. Approve and I will switch to build mode and ship in the priority order already locked in: index → end-game verification → ActiveGameCard + Join → GameSetup recheck/fallback → Lobby.

