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

      {(role === "head_coach" || role === "assistant_coach") && org && (
        <RosterSection orgId={org.id} />
      )}

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

interface Member {
  id: string;
  full_name: string;
  jersey_number: string | null;
  created_at: string;
  role: AppRole;
}

const ROLE_RANK: Record<AppRole, number> = {
  head_coach: 0,
  assistant_coach: 1,
  player: 2,
};

const ROLE_META: Record<AppRole, { label: string; bg: string }> = {
  head_coach: { label: "Head Coach", bg: "#1D9E75" },
  assistant_coach: { label: "Assistant Coach", bg: "#0F6E56" },
  player: { label: "Player", bg: "#5DCAA5" },
};

function formatJoined(iso: string): string {
  const d = new Date(iso);
  return `Joined ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function RosterSection({ orgId }: { orgId: string }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, jersey_number, created_at")
        .eq("org_id", orgId);

      if (pErr) {
        if (!cancelled) setError(pErr.message);
        return;
      }
      const ids = (profiles ?? []).map((p) => p.id);
      if (ids.length === 0) {
        if (!cancelled) setMembers([]);
        return;
      }

      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);

      if (rErr) {
        if (!cancelled) setError(rErr.message);
        return;
      }

      const roleMap = new Map<string, AppRole>(
        (roles ?? []).map((r) => [r.user_id, r.role as AppRole])
      );

      const merged: Member[] = (profiles ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        jersey_number: p.jersey_number,
        created_at: p.created_at,
        role: roleMap.get(p.id) ?? "player",
      }));

      merged.sort((a, b) => {
        const r = ROLE_RANK[a.role] - ROLE_RANK[b.role];
        if (r !== 0) return r;
        if (a.role === "player") return a.full_name.localeCompare(b.full_name);
        return 0;
      });

      if (!cancelled) setMembers(merged);
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const count = members?.length ?? 0;
  const onlyMe = count <= 1;

  return (
    <section className="mb-4 rounded-2xl border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Team Roster</h2>
        </div>
        {members && (
          <span className="text-xs font-medium text-muted-foreground">
            {count} {count === 1 ? "member" : "members"}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-destructive">Couldn't load roster: {error}</p>}

      {!error && members === null && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/50" />
          ))}
        </div>
      )}

      {!error && members && onlyMe && (
        <div className="rounded-xl border border-dashed border-border bg-background/40 p-5 text-center">
          <p className="text-sm text-muted-foreground">
            No players have joined yet. Share your join code to get started.
          </p>
        </div>
      )}

      {!error && members && !onlyMe && (
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                {m.full_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {m.full_name}
                  </p>
                  {m.jersey_number && (
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">
                      #{m.jersey_number}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{formatJoined(m.created_at)}</p>
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                style={{ backgroundColor: ROLE_META[m.role].bg }}
              >
                {ROLE_META[m.role].label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
