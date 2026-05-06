# Super Admin Console — P0 + P1 Build

Build a full super-admin console at `/admin`, seed `omar@rtbcustoms.com` as the first super admin, and ship moderation + data management tools.

## What you'll get

A new **Admin** area (hidden from normal users, no bottom nav) with:

1. **Dashboard** — total users, orgs, teams, games, signups in last 7/30 days
2. **Users** — searchable list of every user across every org with actions:
   - View detail (profile, org, role, last sign-in, games created)
   - Block / unblock (Supabase auth ban — instantly logs them out, blocks future logins)
   - Force sign-out
   - Delete account (auth user + profile + memberships, cascades data)
   - Promote / demote super_admin
3. **Organizations** — list every org with member count, team count, game count, creation date
   - View detail: members, teams, recent activity
   - Delete org (with strong confirm — wipes everything)
4. **Teams** — cross-org team browser, view roster, delete team
5. **Games** — cross-org game browser, filter by org/team/status, delete individual games (fixes orphaned-data cleanup)
6. **Invites** — view all invite links across orgs, revoke any invite
7. **Audit log** — every admin action recorded (who did what, when, target)

## Access model

```text
app_role enum: head_coach | assistant_coach | player | super_admin (NEW)

/admin/*  →  requires super_admin role
            (separate layout, no BottomNav, own sidebar)
```

- New `is_super_admin()` SQL helper (security definer)
- `/admin` route group gated in `beforeLoad` — non-admins redirect to `/home`
- All admin server functions check `is_super_admin(auth.uid())` server-side, not just UI
- Admin queries use `supabaseAdmin` (service role) so they bypass org-scoped RLS

## Technical plan

### Database migration
- Add `super_admin` to `app_role` enum
- Create `is_super_admin(uuid)` security-definer function
- Create `admin_audit_log` table: `id, actor_id, action, target_type, target_id, metadata jsonb, created_at`
- RLS on `admin_audit_log`: only super_admins read; inserts via server only
- Seed: insert `('<omar's auth uid>', 'super_admin')` into `user_roles` after looking up the email in `auth.users` via the migration

### Server functions (`src/server/admin.functions.ts`)
All protected by `requireSupabaseAuth` + an `assertSuperAdmin(userId)` helper that uses `supabaseAdmin`:
- `adminListUsers({ search, page })` — joins auth.users + profiles + roles + org
- `adminGetUser({ userId })`
- `adminBlockUser({ userId })` / `adminUnblockUser` — uses `supabaseAdmin.auth.admin.updateUserById` with `ban_duration`
- `adminDeleteUser({ userId })` — `supabaseAdmin.auth.admin.deleteUser`
- `adminSetSuperAdmin({ userId, enabled })`
- `adminListOrgs`, `adminGetOrg`, `adminDeleteOrg`
- `adminListTeams`, `adminDeleteTeam`
- `adminListGames({ orgId?