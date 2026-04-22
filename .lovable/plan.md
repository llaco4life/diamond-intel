

# Phase 1 — Foundation

Build the skeleton everything else hangs on: Supabase, schema, auth with roles, org creation with join codes, and the navigation shell with stubbed routes.

## What you'll have at the end

- Working signup/login with three roles
- Head coaches create an org and immediately see their join code on the profile page
- Assistant coaches and players join with that code
- Diamond Intel branded home screen with Scout / Learning mode cards
- Mobile bottom tab nav with every route stubbed (styled placeholders)
- Complete database schema with RLS, ready for Phases 2–6

## 1. Backend (Lovable Cloud)

Enable Lovable Cloud and create all tables in one migration:
`profiles`, `organizations`, `opponents`, `games`, `game_assignments`, `pitchers`, `scout_observations`, `at_bats`, `development_items`, `scouting_reports`, plus `user_roles` (security best practice — never trust a role column on profiles) and `org_join_codes` (6-char codes mapping to `org_id`).

RLS policies:
- `profiles`: read/update own row; same-org members can read each other
- `organizations`: members read; only `head_coach` of that org can update
- All org-scoped tables: read/write gated by `org_id = get_my_org_id()`
- `SECURITY DEFINER` helpers `get_my_org_id()` and `has_role()` prevent recursive RLS

Trigger on `auth.users` auto-creates the `profiles` row from signup metadata (`full_name`, `role`, `org_id`).

## 2. Auth flow

- **`/signup`**: email + password + full name + role dropdown
  - `head_coach`: also asks for org name → creates org, generates 6-char join code, makes them owner
  - `assistant_coach` / `player`: asks for join code → links profile to that org. Invalid code = inline error, no account created
- **`/login`**: email + password, redirects to `/`
- `useAuth` hook wraps `onAuthStateChange`, exposes `user`, `profile`, `org`, `role`, `loading`, `signOut`
- `ProtectedRoute` redirects unauthed users to `/login`. Coach-only routes (`/dashboard`) redirect players home with a toast

## 3. Branding & design system

Tokens in `src/styles.css` (oklch):
- `--primary`: `#1D9E75` (Diamond Intel green)
- `--accent-pink`: `#FAF0F5` (player development surfaces)
- Clean cards, dark text on light, generous spacing, mobile-first
- Reusable `<Logo />` with inline SVG diamond + "Diamond Intel" wordmark

No hardcoded color classes anywhere — semantic tokens only.

## 4. Screens in Phase 1

| Route | State |
|---|---|
| `/login` | Fully built |
| `/signup` | Fully built (org create + join code branches) |
| `/` (Home) | Fully built — Scout/Learning mode cards, role-aware shortcut (Dashboard for coaches, Development Log for players), "Active Games Today" placeholder section |
| `/scout` | Stub — "Coming in Phase 2" |
| `/learning` | Stub |
| `/dashboard` | Stub (coach-only guard active) |
| `/development` | Stub |
| `/profile` | Name, role, org name, sign out — **and a prominent "Team Join Code" card visible only to head coaches**, showing the 6-char code in a large monospace font with a copy-to-clipboard button and helper text ("Share this with your assistant coaches and players so they can join your team") |

## 5. Navigation shell

Bottom tab bar, sticky to viewport bottom:
- Home, Scout, Learning, Dashboard (coaches only), Development, Profile
- Active tab in `--primary`
- Renders on every authed route; hidden on `/login` and `/signup`

## Technical notes

- Stack: TanStack Router + Tailwind v4 + Lovable Cloud
- Structure: route files in `src/routes/`, shared components in `src/components/` (`Logo`, `BottomNav`, `ProtectedRoute`, `RoleGuard`, `ModeCard`, `JoinCodeCard`), auth in `src/hooks/useAuth.tsx`
- `SECURITY DEFINER` helpers prevent RLS recursion
- Roles checked via `user_roles` table, never `profiles.role`
- Join codes: 6 uppercase alphanumerics, generated server-side on org creation

## Out of scope (deferred)

Game setup, observation tagging, missions, at-bat logging, dashboard tabs, development log content, PDF export, charts, Compare view, real-time, offline queue, multi-game join flow.

