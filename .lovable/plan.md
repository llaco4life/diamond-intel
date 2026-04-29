# Refine Signup → 2-Step Onboarding (revised)

Goal: cut Step 1 to name/email/password only, then have users either create a team (head coach) or accept an invite link (everyone else). Permissions are derived from the invite, never from a self-selected role.

## User flow

```text
/signup
   └─ Step 1: Full Name • Email • Password • [Continue →]
                │
                ▼ (account created + auto sign-in)
/onboarding
   └─ "How are you joining?"
        ├─ Head Coach              → "Create Your First Team"
        │                            (Team Name, Age Group) → [Create Team]
        │
        └─ Joining an existing team → "Paste your invite link"
                                       (full /invite/<token> URL or token)
                                       → redirect to /invite/<token>
                                       (existing flow assigns role + team)
```

Coach permissions can only come from a coach-scoped invite link issued in `Profile → Invite Links`. There is no self-select Assistant Coach / Player path.

## Why this design

The existing `org_invite_links` table already encodes role + team, and `redeem_invite` enforces it server-side. Reusing it means:
- Assistant coach access requires a head coach to issue a coach invite.
- Player access requires a player invite.
- No new code path can grant coach permissions from user selection alone.

## What changes

### 1. Auth config
- Enable auto-confirm on email signups so Step 1 immediately yields a session.

### 2. `src/routes/signup.tsx` — Step 1 only
- Strip to Full Name, Email, Password, `[Continue →]`.
- No role / org / join-code metadata sent.
- On success, route to `/onboarding`.
- Keep "Already have an account? Sign in" link.

### 3. New route `src/routes/onboarding.tsx`
Guarded: requires a signed-in user; if `profile.org_id` already set, redirect to `/home`.

Local state `view: 'choice' | 'create' | 'invite'`.

- **Choice view** — heading "How are you joining?". Two large cards, no default:
  - "I'm a head coach setting up a new team" → `create`
  - "I'm joining an existing team" → `invite`
  - Small note: "Assistant coaches and players need an invite link from their head coach."
- **Create view** (Head Coach) — heading "Create Your First Team". Fields: Team Name, Age Group (preset dropdown: 8U, 10U, 12U, 14U, 16U, 18U, JV, Varsity, College, Adult). `[Create Team]` calls `completeAsHeadCoach` server fn, refreshes profile, routes to `/home`.
- **Invite view** — heading "Join Your Team". Single field: paste the invite link (or the token portion). On submit, parse the token and `navigate({ to: '/invite/$token', params: { token } })`. The existing `/invite/$token` page previews the invite, shows team name + role, and redeems via `redeem_invite` (which is the only path that grants the role + team membership). Show a clear error if the URL isn't a valid invite link format.

Small "Back" link from each sub-view returns to the choice view.

### 4. New server function `src/server/onboarding.functions.ts`
- `completeAsHeadCoach({ teamName, ageGroup })` — uses `requireSupabaseAuth` and calls a new SQL security-definer function `complete_head_coach_onboarding(_team_name text, _age_group text)` that, in one transaction:
  - creates `organizations` (with generated join_code),
  - creates `teams` (org_id, name, age_group; `set_team_join_code` trigger fills join_code),
  - upserts `profiles` (org_id, active_team_id, full_name from auth metadata),
  - inserts `user_roles(role='head_coach')`,
  - inserts `team_memberships(role='head_coach')`.
- No `completeAsPlayer` / `completeAsAssistantCoach` server fn — that path goes through the existing `/invite/$token` redeem flow only.

### 5. `handle_new_user` trigger update
- If `raw_user_meta_data` does not include `role` (the new Step 1 path) and is not an `invited` flow, the trigger should simply `RETURN NEW` and create no profile / role / team rows. Onboarding handles those later.
- Keep the existing `invited=true` + `invite_token` branch unchanged so `/invite/$token` keeps working.
- Keep the legacy head-coach branch fallback (in case any older client still sends `role=head_coach` + `org_name`).

### 6. Routing guard
- In the post-login landing route (`/home`), if `user && !loading && !profile?.org_id`, redirect to `/onboarding`. Protects users who close the tab between Step 1 and Step 2.

### 7. Invite link UX (small)
- In `Profile → Invite Links` (`src/components/profile/InviteLinksSection.tsx`), make sure the share copy clearly labels "Coach invite" vs "Player invite" so head coaches send the right link. (Read the file first; only touch labels/copy if needed.)

## Out of scope
- No changes to `/login`, `/forgot-password`, broader auth.
- No pricing, no AI onboarding.
- "Season" deferred (editable in team settings later).
- "Parent" role dropped.
- No generic team join-code field for assistants/players in onboarding — invite link only.

## Files touched
- edit: `src/routes/signup.tsx` (3 fields)
- new: `src/routes/onboarding.tsx`
- new: `src/server/onboarding.functions.ts`
- migration: update `handle_new_user`; add `complete_head_coach_onboarding` SQL function
- edit: `src/routes/home.tsx` (redirect to `/onboarding` when org_id missing)
- maybe edit: `src/components/profile/InviteLinksSection.tsx` (clarify "Coach invite" vs "Player invite" labels)
- config: enable email auto-confirm
