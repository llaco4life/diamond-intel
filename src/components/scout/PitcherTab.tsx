import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineWriter } from "@/hooks/useOfflineWriter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useMyInning } from "@/hooks/useMyInning";
import { cn } from "@/lib/utils";

type ScoutTeamSide = "home" | "away";

interface Pitcher {
  id: string;
  jersey_number: string;
  name: string | null;
  notes: string | null;
  is_active: boolean;
  team_side: string | null;
}

export function PitcherTab({
  gameId,
  defaultInning,
  defenseTeam,
  homeTeam,
  awayTeam,
}: {
  gameId: string;
  defaultInning: number;
  defenseTeam?: string;
  homeTeam: string;
  awayTeam: string;
}) {
  const { user } = useAuth();
  const [inning] = useMyInning(gameId, user?.id ?? null, defaultInning);
  const { write } = useOfflineWriter();
  const [pitchers, setPitchers] = useState<Pitcher[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [jersey, setJersey] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  // Default to current defense side (most likely pitching team).
  const defaultSide: ScoutTeamSide = defenseTeam === awayTeam ? "away" : "home";
  const [teamSide, setTeamSide] = useState<ScoutTeamSide>(defaultSide);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("pitchers")
      .select("id, jersey_number, name, notes, is_active, team_side")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });
    setPitchers((data as Pitcher[]) ?? []);
  }, [gameId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const openAdd = () => {
    // Reset to current defense default each time the form opens.
    setTeamSide(defenseTeam === awayTeam ? "away" : "home");
    setShowAdd(true);
  };

  const add = async () => {
    if (!jersey.trim()) {
      toast.error("Jersey number required");
      return;
    }
    const { error } = await supabase.from("pitchers").insert({
      game_id: gameId,
      jersey_number: jersey.trim(),
      name: name.trim() || null,
      notes: notes.trim() || null,
      team_side: teamSide,
      is_active: pitchers.length === 0,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setJersey("");
    setName("");
    setNotes("");
    setShowAdd(false);
    toast.success("Pitcher added");
    reload();
  };

  const setActive = async (id: string) => {
    await supabase.from("pitchers").update({ is_active: false }).eq("game_id", gameId);
    await supabase.from("pitchers").update({ is_active: true }).eq("id", id);
    reload();
  };

  const quickObs = async (pitcherId: string, tag: string) => {
    if (!user) return;
    const res = await write("scout_observations", {
      game_id: gameId,
      player_id: user.id,
      pitcher_id: pitcherId,
      inning,
      is_team_level: true,
      tags: [tag],
      applies_to_team: defenseTeam ?? null,
    });
    if (res.ok) toast.success(tag);
    else toast.warning(`${tag} (queued)`);
  };

  const teamLabel = (side: string | null) => {
    if (side === "home") return homeTeam;
    if (side === "away") return awayTeam;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Pitchers</h3>
        <Button size="sm" onClick={() => (showAdd ? setShowAdd(false) : openAdd())}>
          {showAdd ? "Cancel" : "+ Add"}
        </Button>
      </div>

      {showAdd && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div>
            <Label htmlFor="pj">Jersey #</Label>
            <Input id="pj" value={jersey} onChange={(e) => setJersey(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Team</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["home", "away"] as const).map((side) => {
                const selected = teamSide === side;
                const label = side === "home" ? homeTeam : awayTeam;
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setTeamSide(side)}
                    className={cn(
                      "min-h-11 rounded-full border px-4 text-sm font-medium transition",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label htmlFor="pn">Name (optional)</Label>
            <Input id="pn" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="pno">Notes (optional)</Label>
            <Textarea id="pno" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
          </div>
          <Button onClick={add} className="w-full">
            Save pitcher
          </Button>
        </div>
      )}

      {pitchers.length === 0 && (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No pitchers yet.
        </div>
      )}

      {pitchers.map((p) => {
        const label = teamLabel(p.team_side);
        return (
          <div key={p.id} className="rounded-xl border bg-card p-4">
            <button
              type="button"
              onClick={() => setActive(p.id)}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">
                    #{p.jersey_number}
                    {p.name && <span className="ml-1 text-muted-foreground">— {p.name}</span>}
                  </p>
                  {label && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        p.team_side === "home"
                          ? "bg-primary-soft text-primary"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {label}
                    </span>
                  )}
                </div>
                {p.notes && <p className="mt-1 text-xs text-muted-foreground">{p.notes}</p>}
              </div>
              {p.is_active ? (
                <span className="ml-2 shrink-0 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                  Active
                </span>
              ) : (
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">Tap to activate</span>
              )}
            </button>
            {p.is_active && (
              <div className="mt-3 flex flex-wrap gap-2">
                {["Got tired", "Lost control", "Adjusting"].map((t) => (
                  <button
                    key={t}
                    onClick={() => quickObs(p.id, t)}
                    className="min-h-11 rounded-full border border-primary/30 bg-primary-soft px-4 text-sm font-medium text-primary"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
