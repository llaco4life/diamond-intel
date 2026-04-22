

# Observe Tab — Wording Clarity (already implemented)

All requested changes are already live in `src/components/scout/ObserveTab.tsx` from the previous approved build. No new work is required — confirming the current state below.

## Current state in `ObserveTab.tsx`

**Key Play card**
- Label: `This play was about`
- Options: `Offense: {offenseTeam}` / `Defense: {defenseTeam}`

**By-player card**
- Label: `This player is on`
- Options: `Offense: {offenseTeam}` / `Defense: {defenseTeam}`
- Helper text below toggle (`text-xs text-muted-foreground mt-1.5`):
  - offense → `Logging jersey from {offenseTeam} offense`
  - defense → `Logging jersey from {defenseTeam} defense`

**Save logic**: unchanged — still writes `applies_to_team` using the same offense/defense mapping.

## If something looks off in your preview

If the live preview still shows "Applies to" or the old `·` separator, it's a stale build. Hard-refresh the preview (or let me know what you're seeing) and I can investigate further. Otherwise no code changes are needed for this request.

