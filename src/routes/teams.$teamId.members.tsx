import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, Trash2, UserCog } from "lucide-react";
import { ProtectedShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/teams/$teamId/members")({
  component: () => (
    <ProtectedShell>
      <MembersContent />
    </ProtectedShell>
  ),
});

interface MemberRow {
  id: string;
  user_id: string;
  role: AppRole;
  full_name: string | null;
  jersey: string | null;
}

const ROLE_LABEL: Record<AppRole, string> = {
  head_coach: "Head Coach",
  assistant_coach: "Assistant Coach",
  player: "Player / Parent",
};

function MembersContent() {
  const { teamId } = Route.useParams();
  const { role: myRole } = useAuth();
  const isCoach = myRole === "head_coach" || myRole === "assistant_coach";
  const [team, setTeam] = useState<{ name: string } | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: t }, { data: rows }] = await Promise.all([
      supabase.from("teams").select("name").eq("id", teamId).maybeSingle(),
      supabase
        .from("team_memberships")
        .select("id,user_id,role")
        .eq("team_id", teamId)
        .order("created_at", { ascending: true }),
    ]);
    if (t) setTeam(t as { name: string });
    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const profileMap = new Map<string, { full_name: string | null; jersey: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,jersey_number")
        .in("id", ids);
      for (const p of profs ?? []) {
        profileMap.set(p.id, { full_name: p.full_name, jersey: p.jersey_number });
      }
    }
    setMembers(
      (rows ?? []).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        role: r.role as AppRole,
        full_name: profileMap.get(r.user_id)?.full_name ?? null,
        jersey: profileMap.get(r.user_id)?.jersey ?? null,
      })),
    );
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  const removeMember = async (id: string) => {
    if (!confirm("Remove this member from the team?")) return;
    const { error } = await supabase.from("team_memberships").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Member removed");
    await load();
  };

  const changeRole = async (m: MemberRow, next: AppRole) => {
    if (next === m.role) return;
    // Insert new + delete old (composite unique includes role)
    const { error: insErr } = await supabase
      .from("team_memberships")
      .insert({ team_id: teamId, user_id: m.user_id, role: next });
    if (insErr) {
      toast.error(insErr.message);
      return;
    }
    await supabase.from("team_memberships").delete().eq("id", m.id);
    toast.success("Role updated");
    await load();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-6">
      <header className="mb-3">
        <Link to="/teams/$teamId" params={{ teamId }} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> {team?.name ?? "Team"}
        </Link>
      </header>

      <div className="mb-4 flex items-center gap-2">
        <UserCog className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Manage members</h1>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Members who joined via this team's invite links. Roles here apply to {team?.name ?? "this team"}.
      </p>

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted/50" />
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No members yet. Share a team invite from the team page.
        </div>
      ) : (
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                {m.full_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.full_name ?? "Unknown"}</p>
                {m.jersey && (
                  <p className="text-[11px] text-muted-foreground font-mono">#{m.jersey}</p>
                )}
              </div>
              {isCoach ? (
                <Select value={m.role} onValueChange={(v) => void changeRole(m, v as AppRole)}>
                  <SelectTrigger className="h-9 w-40 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="head_coach">{ROLE_LABEL.head_coach}</SelectItem>
                    <SelectItem value="assistant_coach">{ROLE_LABEL.assistant_coach}</SelectItem>
                    <SelectItem value="player">{ROLE_LABEL.player}</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">
                  {ROLE_LABEL[m.role]}
                </span>
              )}
              {isCoach && (
                <Button size="icon" variant="ghost" onClick={() => void removeMember(m.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
