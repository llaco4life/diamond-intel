import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Plus, Users, Trash2 } from "lucide-react";
import { ProtectedShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTeam } from "@/hooks/useActiveTeam";
import { toast } from "sonner";

export const Route = createFileRoute("/teams/")({
  component: TeamsRoute,
});

function TeamsRoute() {
  return (
    <ProtectedShell>
      <TeamsContent />
    </ProtectedShell>
  );
}

function TeamsContent() {
  const { user, org, role } = useAuth();
  const { teams, refresh, activeTeamId, setActiveTeamId } = useActiveTeam();
  const isCoach = role === "head_coach" || role === "assistant_coach";
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [season, setSeason] = useState(String(new Date().getFullYear()));
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!user || !org) return;
    if (!name.trim()) {
      toast.error("Team name is required");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("teams")
      .insert({
        org_id: org.id,
        name: name.trim(),
        age_group: age.trim() || null,
        season: season.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Team created");
    setName("");
    setAge("");
    setCreating(false);
    await refresh();
    if (data?.id) await setActiveTeamId(data.id);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this team? Roster and code maps tied to it will also be removed.")) return;
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    toast.success("Team deleted");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-6">
      <header className="mb-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Home
        </Link>
      </header>

      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">My Teams</h1>
          <p className="text-xs text-muted-foreground">Teams you coach. Switch active team from the header.</p>
        </div>
      </div>

      {isCoach && (
        !creating ? (
          <Button onClick={() => setCreating(true)} className="mb-4 w-full gap-2">
            <Plus className="h-4 w-4" /> Add a team
          </Button>
        ) : (
          <div className="mb-4 space-y-3 rounded-2xl border bg-card p-4">
            <div>
              <Label htmlFor="t-name">Team name</Label>
              <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lady Rebels" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="t-age">Age group</Label>
                <Input id="t-age" value={age} onChange={(e) => setAge(e.target.value)} placeholder="12U" />
              </div>
              <div>
                <Label htmlFor="t-season">Season</Label>
                <Input id="t-season" value={season} onChange={(e) => setSeason(e.target.value)} placeholder="2026" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCreating(false)} className="flex-1">Cancel</Button>
              <Button onClick={create} disabled={busy} className="flex-1">
                {busy ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        )
      )}

      {teams.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No teams yet. {isCoach ? "Add one above." : "Ask a coach to add a team."}
        </div>
      ) : (
        <ul className="space-y-2">
          {teams.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-3">
              <Link to="/teams/$teamId" params={{ teamId: t.id }} className="min-w-0 flex-1">
                <p className="truncate font-semibold">{t.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {[t.age_group, t.season].filter(Boolean).join(" · ") || "—"}
                  {t.id === activeTeamId && <span className="ml-2 text-primary">• Active</span>}
                </p>
              </Link>
              <div className="flex items-center gap-1">
                {t.id !== activeTeamId && (
                  <Button size="sm" variant="outline" onClick={() => void setActiveTeamId(t.id)}>
                    Set active
                  </Button>
                )}
                {isCoach && (
                  <Button size="icon" variant="ghost" onClick={() => void remove(t.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
