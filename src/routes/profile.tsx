import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Check, LogOut, Users, Pencil, Settings, ImageIcon } from "lucide-react";
import { ProtectedShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { useActiveTeam } from "@/hooks/useActiveTeam";
import { supabase } from "@/integrations/supabase/client";
import { InviteLinksSection } from "@/components/profile/InviteLinksSection";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  component: () => (
    <ProtectedShell>
      <ProfilePage />
    </ProtectedShell>
  ),
});

function ProfilePage() {
  const { profile, org, role, signOut, refreshProfile } = useAuth();
  const [jersey, setJersey] = useState(profile?.jersey_number ?? "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const isHeadCoach = role === "head_coach";
  const roleLabel =
    role === "head_coach" ? "Head Coach" : role === "assistant_coach" ? "Assistant Coach" : "Player";

  const copyCode = async () => {
    if (!org?.join_code) return;
    await navigator.clipboard.writeText(org.join_code);
    setCopied(true);
    toast.success("Join code copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const saveJersey = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ jersey_number: jersey || null })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    refreshProfile();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo size="md" />
      </header>

      <h1 className="mb-1 text-2xl font-bold tracking-tight">Profile</h1>
      <p className="mb-6 text-sm text-muted-foreground">Manage your account and team</p>

      <section className="mb-4 rounded-2xl border bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-lg font-bold text-primary">
            {profile?.full_name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{profile?.full_name}</p>
            <p className="text-sm text-muted-foreground">{roleLabel}{org ? ` · ${org.name}` : ""}</p>
          </div>
        </div>
      </section>

      <ActiveTeamCard role={role} />

      {isHeadCoach && org && (
        <section className="mb-4 rounded-2xl border-2 border-primary/30 bg-primary-soft p-5 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
            Team Join Code
          </h2>
          <p className="mt-1 text-xs text-foreground/70">
            Share this with your assistant coaches and players so they can join your team.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 rounded-xl bg-card px-4 py-4 text-center font-mono text-3xl font-bold tracking-[0.4em] text-foreground shadow-sm">
              {org.join_code}
            </div>
            <Button onClick={copyCode} size="lg" variant="outline" className="h-auto py-4">
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </Button>
          </div>
        </section>
      )}

      {role === "player" && (
        <section className="mb-4 rounded-2xl border bg-card p-5 shadow-card">
          <Label htmlFor="jersey" className="text-sm font-semibold">
            Jersey number
          </Label>
          <div className="mt-2 flex gap-2">
            <Input
              id="jersey"
              value={jersey}
              onChange={(e) => setJersey(e.target.value)}
              placeholder="e.g. 12"
              className="max-w-32"
            />
            <Button onClick={saveJersey} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </section>
      )}

      {isHeadCoach && org && <InviteLinksSection orgId={org.id} />}


      <section className="mt-4 rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold">My game history</h2>
        <p className="text-sm text-muted-foreground">
          Coming soon — once you've logged a game, your history will appear here.
        </p>
      </section>

      <div className="mt-6">
        <Button variant="outline" className="w-full" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

interface TeamMemberCounts {
  head_coach: number;
  assistant_coach: number;
  player: number;
  total: number;
  myRole: AppRole | null;
}

function ActiveTeamCard({ role }: { role: AppRole | null }) {
  const { activeTeam, activeTeamId, loading } = useActiveTeam();
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [rosterCount, setRosterCount] = useState<number>(0);
  const [counts, setCounts] = useState<TeamMemberCounts>({
    head_coach: 0,
    assistant_coach: 0,
    player: 0,
    total: 0,
    myRole: null,
  });

  useEffect(() => {
    if (!activeTeamId) {
      setLogoUrl(null);
      setRosterCount(0);
      setCounts({ head_coach: 0, assistant_coach: 0, player: 0, total: 0, myRole: null });
      return;
    }
    void (async () => {
      const [{ data: team }, { count }, { data: members }] = await Promise.all([
        supabase.from("teams").select("logo_url").eq("id", activeTeamId).maybeSingle(),
        supabase
          .from("team_roster")
          .select("id", { count: "exact", head: true })
          .eq("team_id", activeTeamId),
        supabase
          .from("team_memberships")
          .select("user_id, role")
          .eq("team_id", activeTeamId),
      ]);
      setLogoUrl((team as { logo_url?: string | null } | null)?.logo_url ?? null);
      setRosterCount(count ?? 0);
      const next: TeamMemberCounts = {
        head_coach: 0,
        assistant_coach: 0,
        player: 0,
        total: 0,
        myRole: null,
      };
      for (const m of members ?? []) {
        const r = m.role as AppRole;
        if (r === "head_coach" || r === "assistant_coach" || r === "player") next[r] += 1;
        next.total += 1;
        if (user && m.user_id === user.id) next.myRole = r;
      }
      // Fall back to org-wide role if no team membership row exists yet
      if (!next.myRole) next.myRole = role;
      setCounts(next);
    })();
  }, [activeTeamId, role, user]);

  const myRoleLabel =
    counts.myRole === "head_coach"
      ? "Head Coach"
      : counts.myRole === "assistant_coach"
      ? "Assistant Coach"
      : counts.myRole === "player"
      ? "Player"
      : "—";

  if (!loading && !activeTeam) {
    return (
      <section className="mb-4 rounded-2xl border border-dashed border-border bg-card p-5 text-center shadow-card">
        <p className="text-sm font-semibold">No active team</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick or create a team to start scouting and tracking pitches.
        </p>
        <Link to="/teams" className="mt-3 inline-block">
          <Button size="sm">Manage teams</Button>
        </Link>
      </section>
    );
  }

  return (
    <section className="mb-4 rounded-2xl border-2 border-primary/30 bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-soft">
          {logoUrl ? (
            <img src={logoUrl} alt={activeTeam?.name ?? "Team logo"} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-primary/60" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Active team</div>
          <div className="truncate text-base font-bold text-foreground">{activeTeam?.name ?? "—"}</div>
          <div className="truncate text-xs text-muted-foreground">
            {[activeTeam?.age_group, activeTeam?.season].filter(Boolean).join(" · ") || "No age group / season"}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-border pt-3 text-sm">
        <Row label="My role" value={myRoleLabel} />
        <Row label="Roster" value={`${rosterCount} player${rosterCount === 1 ? "" : "s"}`} />
        <Row
          label="Members"
          value={`${counts.head_coach} HC · ${counts.assistant_coach} AC · ${counts.player} P`}
        />
      </div>

      {activeTeamId && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link to="/teams/$teamId" params={{ teamId: activeTeamId }}>
            <Button size="sm" variant="outline" className="w-full gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit team
            </Button>
          </Link>
          <Link to="/teams/$teamId/members" params={{ teamId: activeTeamId }}>
            <Button size="sm" variant="outline" className="w-full gap-1.5">
              <Users className="h-3.5 w-3.5" /> Manage members
            </Button>
          </Link>
        </div>
      )}

      <Link to="/teams" className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <Settings className="h-3 w-3" /> Switch or create team
      </Link>
    </section>
  );
}

