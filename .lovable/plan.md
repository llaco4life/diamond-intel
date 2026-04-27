# Match Learning + Pitch Intel UX to Scout

Scout has a clean lobby pattern users like:
- **Start** new game (team-name form → instantly joined)
- **Active games** list (everyone in the org sees what's running) with **Join** + **Delete**
- **Recent games** with View summary / Resume / Delete

Learning and Pitch Intel both diverge from this. Bring them in line.

---

## Pitch Intel (`/pitch`) — biggest gap

Currently the lobby uses bare `<Link>` rows with no Join button and no Delete. The "start game → enter teams → game" flow already works (it navigates to `/pitch/$gameId`), so we keep that, but rework the rest to mirror Scout.

**Edit `src/routes/pitch.tsx`:**

- Extract logic into a new `PitchLobby` shape (still in same file, single component is fine — like Scout's `GameLobby`).
- Query games scoped to `org_id` (already done) and split into:
  - **Active** = `status = 'active'` and `game_type = 'pitch'`
  - **Recent** = `status = 'ended'` and `game_type = 'pitch'`, limit 3
- Each Active row shows:
  - `home_team vs away_team`
  - "Started X min ago by {creator name}" (lookup `profiles.full_name` by `created_by`)
  - "N pitches logged" (count `pitch_entries` for `game_id`) — Pitch Intel's analog of Scout's "people tracking" stat
  - `Active` badge
  - `<DeleteGameButton iconOnly … />` → `supabase.from("games").delete().eq("id", g.id)`
  - **Join Game** button → `navigate({ to: "/pitch/$gameId", params: { gameId: g.id } })`
- Each Recent row shows: View summary placeholder (link to game route), Resume (`update status: 'active'`), Delete.
- Keep the existing inline "Start a Pitch Intel game" form (home/away inputs → insert game → navigate). Move the **Codes** button next to Start so it stays accessible.

**Edit `src/routes/pitch.$gameId.tsx`:**

- Convert the `<button>` "← Pitch Intel" header into a real `Button variant="ghost" size="sm"` so the way back to the dashboard is clearly tappable (matches Scout's back affordance).
- No behavior change otherwise.

---

## Learning (`/learning`) — add Join, stop auto-resume

Learning currently auto-resumes the user's most recent active session on mount, which means you never see the lobby and there's no Join flow. It also scopes everything to `created_by = userId`, so even within an org each player only sees their own sessions. The Delete button already exists.

Two refinements to match Scout:

**Edit `src/routes/learning.tsx`:**

- **Remove the auto-resume effect** (lines 30–54) so users always land on the lobby and explicitly tap Resume/Join. This is the same model as Scout — multiple sessions can exist; user picks one.

**Edit `src/components/learning/LearningLobby.tsx`:**

- Replace the existing "Resume" button label with **Join Session** for the Active sessions list (the action is the same — `onResume(g)` — but the label aligns with Scout's "Join Game" verb the user is used to).
- Keep the "Reflect now" button for `learning_phase = 'reflect'` rows since reflection is a distinct action.
- Keep Delete buttons exactly as they are (they already work).
- Keep Recent sessions section with View summary / Resume / Delete (already correct).

> Note: Learning sessions stay **per-user** (filter `created_by = userId`) — they're personal prep/reflect notes, not team-shared like Scout games. The user said "match the UX," not "make Learning multi-user," so we keep the data scope and only align the lobby controls.

---

## Files touched

- **edit** `src/routes/pitch.tsx` — full rework of game list (Active/Recent split, Join + Delete + creator + pitch count)
- **edit** `src/routes/pitch.$gameId.tsx` — back button styling
- **edit** `src/routes/learning.tsx` — remove auto-resume effect
- **edit** `src/components/learning/LearningLobby.tsx` — relabel Resume → Join Session in Active sessions

## Files reused (no changes)

- `src/components/DeleteGameButton.tsx` — already used by Scout and Learning
- Existing `games` table RLS already permits org members to read and the creator (or head_coach) to delete

## Out of scope

- No DB migration
- No changes to Scout (already correct per user)
- No changes to live logger logic, fatigue, recommendations, batter profile, prep/reflect screens

Approve and I'll build it.