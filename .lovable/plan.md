

# Observe Tab — Wording-only update for Key Play & By-Player

Single-file change in `src/components/scout/ObserveTab.tsx`. No schema, no save logic, no other components.

## Changes

1. **`SideToggle` component** — add a required `label: string` prop. Render the label in place of the hardcoded `"Applies to:"`. Change option separator from `·` to `:` so options read `Offense: {offenseTeam}` and `Defense: {defenseTeam}`.

2. **Key Play card** — pass `label="This play was about"` to `SideToggle`.

3. **By-player card** — pass `label="This player is on"` to `SideToggle`. Add helper text directly below the toggle (`text-xs text-muted-foreground mt-1.5`):
   - offense selected → `Logging jersey from {offenseTeam} offense`
   - defense selected → `Logging jersey from {defenseTeam} defense`

## Out of scope
- DB / `applies_to_team` logic unchanged.
- Coaching sheet, context card, tag grid badges, recent observations chips unchanged.
- Context-aware default behavior on Key Play preserved.

