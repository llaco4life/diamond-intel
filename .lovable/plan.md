I’ll fix the Pitch Intel flow so the lineup pointer, batter status, scoreboard, outs, and inning transitions are clear and work consistently.

## What “Set as current” should do

“Set as current” should manually choose the batter who is currently at bat in the lineup flow. It should update the game flow banner and card badges, but it should not necessarily open the pitch tracking screen by itself. To remove confusion, I’ll make its effect visible immediately and label the flow more clearly.

## Changes to implement

1. Make current batter state obvious on lineup screen

- Add a compact lineup flow summary above the cards:
  ```text
  Last batter: #24 Emma
  Current batter: #7 Smith
  Next batter: #12 Jones
  On deck: #24 Emma
  ```
- When “Set as current” is tapped, update that summary immediately.
- Show a success message like “Current batter set to #7 Smith”.
- Keep tapping the main card area as the action to open the live Pitch Intel evaluation screen.

2. Track and display last batter

- Extend the current batter helper so it stores both:
  - current batter index
  - last completed batter index
- When “End at-bat → Next batter” is used, set the batter being ended as the last batter, then advance current to the next batter.
- Show “Last batter” on the lineup banner and the live at-bat screen.

3. Show scoreboard and outs during pitch tracking

- Add the scoreboard banner to `/pitch/$gameId/batter/$batterKey`, not just the lineup screen.
- Show inning, top/bottom, score, outs, and active pitcher pitch count while logging pitches.
- This prevents the coach from losing game context once they enter the live at-bat evaluation screen.

4. Make 3 outs end the inning

- Add an outs control that caps at 3.
- When outs reach 3:
  - reset outs to 0
  - advance to the next half-inning
  - switch top/bottom by changing the batting team
  - after Bottom half ends, increment the inning number
- Persist this game-flow state so it does not disappear on refresh or after edits.
- Allow user to edit inning or outs in case of a mistake on entry is made

5. Persist game flow safely

- Use a new lightweight game-flow storage helper/hook for:
  - current batter index
  - last batter index
  - outs
  - current batting team
- Keep scores and inning in the existing game record.
- Use local backup plus existing backend updates so the UI does not reset during app reloads.

6. Reduce confusion around buttons

- Keep Edit / Sub / Remove isolated from navigation.
- Make the card’s main area clearly say “Tap card to track pitches”.
- Rename or visually clarify “Set as current” as a lineup-flow control, not a pitch-tracking navigation button.

## Technical details

Files to edit:

- `src/hooks/useCurrentBatter.ts`
  - Store and expose `lastIndex`, `markCurrentComplete`, and reliable persisted state.
- `src/components/pitch/NextBatterBanner.tsx`
  - Add Last / Current / Next / On deck display.
- `src/components/pitch/ScoreboardBanner.tsx`
  - Support 3-out handling and clear inning/outs controls.
- `src/routes/pitch.$gameId.tsx`
  - Wire “Set as current” to visible feedback and the expanded batter flow banner.
  - Persist batting team and outs instead of keeping them as fragile screen-only state.
- `src/routes/pitch.$gameId.batter.$batterKey.tsx`
  - Add scoreboard/outs banner to live pitch tracking.
  - Wire “End at-bat → Next batter” to mark last batter and advance current.
  - Ensure 3 outs advance the half-inning.

No database schema change is required for this fix.