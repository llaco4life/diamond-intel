import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { ChevronLeft, Plus, Trash2, Save, Upload, ImageIcon } from "lucide-react";
import { ProtectedShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface RosterRow {
  id: string;
  team_id: string;
  jersey_number: string;
  name: string | null;
  position: string | null;
  bat_order: number | null;
}

interface TeamRow {
  id: string;
  name: string;
  age_group: string | null;
  season: string | null;
  logo_url: string | null;
}

export const Route = createFileRoute("/teams/$teamId")({
  component: TeamDetailRoute,
});

function TeamDetailRoute() {
  return (
    <ProtectedShell>
      <TeamDetailContent />
    </ProtectedShell>
  );
}

function TeamDetailContent() {
  const { teamId } = Route.useParams();
  const { role } = useAuth();
  const isCoach = role === "head_coach" || role === "assistant_coach";

  const [team, setTeam] = useState<TeamRow | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [season, setSeason] = useState("");
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [newJersey, setNewJersey] = useState("");
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    const [{ data: t }, { data: r }] = await Promise.all([
      supabase.from("teams").select("id,name,age_group,season").eq("id", teamId).maybeSingle(),
      supabase
        .from("team_roster")
        .select("*")
        .eq("team_id", teamId)
        .order("bat_order", { ascending: true, nullsFirst: false })
        .order("jersey_number"),
    ]);
    if (t) {
      setTeam(t as TeamRow);
      setName(t.name);
      setAge(t.age_group ?? "");
      setSeason(t.season ?? "");
    }
    setRoster((r ?? []) as RosterRow[]);
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveTeam = async () => {
    const { error } = await supabase
      .from("teams")
      .update({ name: name.trim(), age_group: age.trim() || null, season: season.trim() || null })
      .eq("id", teamId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Team saved");
    await load();
  };

  const addBatter = async () => {
    if (!newJersey.trim()) {
      toast.error("Jersey number required");
      return;
    }
    const nextOrder = (roster[roster.length - 1]?.bat_order ?? roster.length) + 1;
    const { error } = await supabase.from("team_roster").insert({
      team_id: teamId,
      jersey_number: newJersey.trim(),
      name: newName.trim() || null,
      bat_order: nextOrder,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewJersey("");
    setNewName("");
    await load();
  };

  const removeBatter = async (id: string) => {
    const { error } = await supabase.from("team_roster").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await load();
  };

  if (!team) {
    return <div className="mx-auto max-w-2xl px-4 pt-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-6">
      <header className="mb-3">
        <Link to="/teams" className="flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> My Teams
        </Link>
      </header>

      <h1 className="mb-4 text-2xl font-bold">{team.name}</h1>

      <section className="mb-5 space-y-3 rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Team info</h2>
        <div>
          <Label htmlFor="e-name">Name</Label>
          <Input id="e-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!isCoach} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="e-age">Age group</Label>
            <Input id="e-age" value={age} onChange={(e) => setAge(e.target.value)} disabled={!isCoach} />
          </div>
          <div>
            <Label htmlFor="e-season">Season</Label>
            <Input id="e-season" value={season} onChange={(e) => setSeason(e.target.value)} disabled={!isCoach} />
          </div>
        </div>
        {isCoach && (
          <Button onClick={saveTeam} className="gap-1.5">
            <Save className="h-4 w-4" /> Save
          </Button>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Roster</h2>

        {isCoach && (
          <div className="flex gap-2">
            <Input
              placeholder="#"
              value={newJersey}
              onChange={(e) => setNewJersey(e.target.value)}
              className="w-16 text-center font-mono"
            />
            <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
            <Button onClick={addBatter} className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        )}

        <ul className="space-y-1.5">
          {roster.map((b, i) => (
            <li key={b.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <span className="w-8 text-center text-xs text-muted-foreground">{i + 1}.</span>
              <span className="w-12 text-center font-mono font-bold">#{b.jersey_number}</span>
              <span className="flex-1 truncate text-sm">{b.name ?? "—"}</span>
              {isCoach && (
                <Button size="icon" variant="ghost" onClick={() => void removeBatter(b.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </li>
          ))}
          {roster.length === 0 && (
            <li className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No roster yet. Add batters above.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
