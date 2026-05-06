import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertSuperAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error || !data) throw new Error("forbidden");
}

async function audit(
  actorId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata: Record<string, unknown> = {},
) {
  await supabaseAdmin.from("admin_audit_log").insert([
    {
      actor_id: actorId,
      action,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      metadata: metadata as never,
    },
  ]);
}

// ---------- Stats ----------
export const adminGetStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const sevenDays = new Date(Date.now() - 7 * 86400000).toISOString();
    const thirtyDays = new Date(Date.now() - 30 * 86400000).toISOString();

    const [users, orgs, teams, games, signups7, signups30] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("organizations").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("teams").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("games").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDays),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", thirtyDays),
    ]);

    return {
      users: users.count ?? 0,
      orgs: orgs.count ?? 0,
      teams: teams.count ?? 0,
      games: games.count ?? 0,
      signups7: signups7.count ?? 0,
      signups30: signups30.count ?? 0,
    };
  });

// ---------- Users ----------
export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ search: z.string().optional(), page: z.number().default(1) }).parse(input))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);
    const perPage = 50;
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
      page: data.page,
      perPage,
    });
    if (error) throw new Error(error.message);

    let users = list.users;
    if (data.search) {
      const q = data.search.toLowerCase();
      users = users.filter((u) => (u.email ?? "").toLowerCase().includes(q));
    }

    const ids = users.map((u) => u.id);
    const [profilesRes, rolesRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, org_id").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);
    const orgIds = [...new Set((profilesRes.data ?? []).map((p) => p.org_id).filter(Boolean) as string[])];
    const orgsRes = orgIds.length
      ? await supabaseAdmin.from("organizations").select("id, name").in("id", orgIds)
      : { data: [] as { id: string; name: string }[] };

    const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
    const orgMap = new Map((orgsRes.data ?? []).map((o) => [o.id, o]));
    const rolesMap = new Map<string, string[]>();
    for (const r of rolesRes.data ?? []) {
      if (!rolesMap.has(r.user_id)) rolesMap.set(r.user_id, []);
      rolesMap.get(r.user_id)!.push(r.role);
    }

    const rows = users.map((u) => {
      const p = profileMap.get(u.id);
      const orgId = p?.org_id ?? null;
      return {
        id: u.id,
        email: u.email ?? "",
        full_name: p?.full_name ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        banned_until: (u as unknown as { banned_until?: string | null }).banned_until ?? null,
        org_id: orgId,
        org_name: orgId ? orgMap.get(orgId)?.name ?? null : null,
        roles: rolesMap.get(u.id) ?? [],
      };
    });

    return { users: rows, page: data.page, hasMore: list.users.length === perPage };
  });

export const adminBlockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ userId: z.string().uuid(), block: z.boolean() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.block ? "876000h" : "none",
    });
    if (error) throw new Error(error.message);
    await audit(context.userId, data.block ? "block_user" : "unblock_user", "user", data.userId);
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("cannot delete self");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("team_memberships").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await audit(context.userId, "delete_user", "user", data.userId);
    return { ok: true };
  });

export const adminSetSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ userId: z.string().uuid(), enabled: z.boolean() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);
    if (data.enabled) {
      await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: "super_admin" });
    } else {
      if (data.userId === context.userId) throw new Error("cannot demote self");
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "super_admin");
    }
    await audit(context.userId, data.enabled ? "grant_super_admin" : "revoke_super_admin", "user", data.userId);
    return { ok: true };
  });

// ---------- Orgs ----------
export const adminListOrgs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { data: orgs } = await supabaseAdmin
      .from("organizations")
      .select("id, name, join_code, created_at, created_by")
      .order("created_at", { ascending: false });
    const ids = (orgs ?? []).map((o) => o.id);
    const [members, teams, games] = await Promise.all([
      supabaseAdmin.from("profiles").select("org_id").in("org_id", ids),
      supabaseAdmin.from("teams").select("org_id").in("org_id", ids),
      supabaseAdmin.from("games").select("org_id").in("org_id", ids),
    ]);
    const count = (rows: { org_id: string | null }[] | null, id: string) =>
      (rows ?? []).filter((r) => r.org_id === id).length;
    return (orgs ?? []).map((o) => ({
      ...o,
      member_count: count(members.data, o.id),
      team_count: count(teams.data, o.id),
      game_count: count(games.data, o.id),
    }));
  });

export const adminDeleteOrg = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ orgId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);
    // Manual cascade
    const { data: games } = await supabaseAdmin.from("games").select("id").eq("org_id", data.orgId);
    const gameIds = (games ?? []).map((g) => g.id);
    if (gameIds.length) {
      await supabaseAdmin.from("pitch_entries").delete().in("game_id", gameIds);
      await supabaseAdmin.from("scout_observations").delete().in("game_id", gameIds);
      await supabaseAdmin.from("at_bats").delete().in("game_id", gameIds);
      await supabaseAdmin.from("game_assignments").delete().in("game_id", gameIds);
      await supabaseAdmin.from("diamond_decision_responses").delete().in("game_id", gameIds);
      await supabaseAdmin.from("pinned_must_know").delete().in("game_id", gameIds);
      await supabaseAdmin.from("scouting_reports").delete().in("game_id", gameIds);
      await supabaseAdmin.from("pitch_lineups").delete().in("game_id", gameIds);
      await supabaseAdmin.from("pitchers").delete().in("game_id", gameIds);
    }
    await supabaseAdmin.from("games").delete().eq("org_id", data.orgId);
    await supabaseAdmin.from("opponents").delete().eq("org_id", data.orgId);
    await supabaseAdmin.from("development_items").delete().eq("org_id", data.orgId);
    await supabaseAdmin.from("pitch_code_map").delete().eq("org_id", data.orgId);
    await supabaseAdmin.from("pitch_types").delete().eq("org_id", data.orgId);
    await supabaseAdmin.from("org_invite_links").delete().eq("org_id", data.orgId);
    const { data: teams } = await supabaseAdmin.from("teams").select("id").eq("org_id", data.orgId);
    const teamIds = (teams ?? []).map((t) => t.id);
    if (teamIds.length) {
      await supabaseAdmin.from("team_memberships").delete().in("team_id", teamIds);
      await supabaseAdmin.from("team_roster").delete().in("team_id", teamIds);
      await supabaseAdmin.from("pitchers").delete().in("team_id", teamIds);
    }
    await supabaseAdmin.from("teams").delete().eq("org_id", data.orgId);
    await supabaseAdmin.from("profiles").update({ org_id: null, active_team_id: null }).eq("org_id", data.orgId);
    await supabaseAdmin.from("organizations").delete().eq("id", data.orgId);
    await audit(context.userId, "delete_org", "org", data.orgId);
    return { ok: true };
  });

// ---------- Teams ----------
export const adminListTeams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("teams")
      .select("id, name, age_group, org_id, created_at, organizations(name)")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminDeleteTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ teamId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);
    await supabaseAdmin.from("team_memberships").delete().eq("team_id", data.teamId);
    await supabaseAdmin.from("team_roster").delete().eq("team_id", data.teamId);
    await supabaseAdmin.from("pitchers").delete().eq("team_id", data.teamId);
    await supabaseAdmin.from("pitch_types").delete().eq("team_id", data.teamId);
    await supabaseAdmin.from("pitch_code_map").delete().eq("team_id", data.teamId);
    await supabaseAdmin.from("games").update({ team_id: null }).eq("team_id", data.teamId);
    await supabaseAdmin.from("profiles").update({ active_team_id: null }).eq("active_team_id", data.teamId);
    await supabaseAdmin.from("teams").delete().eq("id", data.teamId);
    await audit(context.userId, "delete_team", "team", data.teamId);
    return { ok: true };
  });

// ---------- Games ----------
export const adminListGames = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ orgId: z.string().uuid().optional(), limit: z.number().default(100) }).parse(i))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);
    let q = supabaseAdmin
      .from("games")
      .select("id, home_team, away_team, status, game_date, org_id, team_id, created_at, organizations(name)")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.orgId) q = q.eq("org_id", data.orgId);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const adminDeleteGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ gameId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);
    const id = data.gameId;
    await supabaseAdmin.from("pitch_entries").delete().eq("game_id", id);
    await supabaseAdmin.from("scout_observations").delete().eq("game_id", id);
    await supabaseAdmin.from("at_bats").delete().eq("game_id", id);
    await supabaseAdmin.from("game_assignments").delete().eq("game_id", id);
    await supabaseAdmin.from("diamond_decision_responses").delete().eq("game_id", id);
    await supabaseAdmin.from("pinned_must_know").delete().eq("game_id", id);
    await supabaseAdmin.from("scouting_reports").delete().eq("game_id", id);
    await supabaseAdmin.from("pitch_lineups").delete().eq("game_id", id);
    await supabaseAdmin.from("pitchers").delete().eq("game_id", id);
    await supabaseAdmin.from("games").delete().eq("id", id);
    await audit(context.userId, "delete_game", "game", id);
    return { ok: true };
  });

// ---------- Invites ----------
export const adminListInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("org_invite_links")
      .select("id, token, role, uses_count, max_uses, expires_at, revoked_at, created_at, org_id, organizations(name)")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminRevokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ inviteId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);
    await supabaseAdmin.from("org_invite_links").update({ revoked_at: new Date().toISOString() }).eq("id", data.inviteId);
    await audit(context.userId, "revoke_invite", "invite", data.inviteId);
    return { ok: true };
  });

// ---------- Audit log ----------
export const adminListAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const actorIds = [...new Set((data ?? []).map((r) => r.actor_id))];
    const { data: profs } = actorIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", actorIds)
      : { data: [] as { id: string; full_name: string }[] };
    const map = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    return (data ?? []).map((r) => ({ ...r, actor_name: map.get(r.actor_id) ?? r.actor_id }));
  });
