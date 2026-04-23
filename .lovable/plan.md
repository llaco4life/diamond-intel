

# Apply Same Tag Feedback + Edit/Delete to Scout Mode

You're right — Scout Mode has the exact same problem (silent chip taps, no undo, no fixing mistakes). Since `TeamTagGrid` and `ObservationList` are already shared between both modes, extending the fix to Scout is mostly wiring, not new components.

## What changes in Scout Mode

Scout's `ObserveTab` (`src/components/scout/ObserveTab.tsx`) gets the same treatment as Learning's Observe tab:

1. **Count badges + green flash on chips** — derive `tagCounts` from the existing `recent` observations filtered by current inning, track `justAddedTag` for the 600ms flash, pass both into `TeamTagGrid`.
2. **Undo on success toast** — switch the success toast to a sonner action toast: `{ action: { label: "Undo", onClick: () => deleteObservation(id) } }`. Uses the row id returned from `useOfflineWriter`.
3. **Trash + edit icons on "Recent observations"** — pass `onDelete` and `onEdit` handlers into `ObservationList`. Edit opens an inline prompt for `key_play` rows; trash confirms then deletes.
4. **Pitching gating** — Scout already requires picking a pitcher in the Pitcher tab, but Observe currently lets you tap Pitching chips with no pitcher context. Add the same 50% opacity + "Pick a pitcher first" inline note when no active pitcher exists for the defense team.

## What does NOT change in Scout Mode

- Coach-only views, scouting reports, game plan editor — untouched.
- `MyJobTab`, `StealItTab`, `PitcherTab` — untouched.
- The existing scout observation write payload shape — unchanged.

## Backend

The DELETE policy on `scout_observations` from the Learning plan already covers Scout — it's keyed on `player_id = auth.uid()`, which applies to whoever logged the row regardless of mode. **No additional migration needed.**

The UPDATE policy already exists for `player_id = auth.uid()`, so editing `key_play` works in Scout too.

## Files touched (delta on top of the Learning plan)

- `src/components/scout/ObserveTab.tsx` — derive `tagCounts`/`justAddedTag`, implement `deleteObservation`/`editKeyPlay`, wire Undo into the toast, pass handlers + counts into `TeamTagGrid` and `ObservationList`, gate Pitching chips when no active pitcher.
- No new components. No new migration. No changes to `TeamTagGrid` / `ObservationList` / `useOfflineWriter` beyond what the Learning plan already specifies (the props are optional and shared).

## Build order

1. Apply the Learning Mode changes (TeamTagGrid + ObservationList + useOfflineWriter + DELETE migration + LearningObserveTab).
2. In the same pass, wire the same handlers into `ObserveTab.tsx` for Scout. Because the shared components already accept the optional props, Scout just needs to pass them.

## Out of scope

- Bulk delete, per-tag analytics, undo for queued/offline writes (Undo only shows when the insert succeeded online and we have a row id).
- Editing tags on a row (only `key_play` text is editable; to fix a wrong tag, delete and re-tap).

