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

interface Pitcher {
  id: string;
  jersey_number: string;
  name: string | null;
  notes: string | null;
  is_active: boolean;
}

export function PitcherTab({
  gameId,
  defaultInning,
}: {
  gameId: string;
  defaultInning: number;
}) {
  const { user } = useAuth();
  const [inning] = useMyInning(gameId, user?.id ?? null, defaultInning);
  const { write } = useOfflineWriter();
  const [pitchers, setPitchers] = useState<Pitcher[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [jersey, setJersey] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("pitchers")
      .select("id, jersey_number, name, notes, is_active")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });
    setPitchers((data as Pitcher[]) ?? []);
  }, [gameId]);

  useEffect(() => {
    reload();
  }, [reload]);

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
    });
    if (res.ok) toast.success(tag);
    else toast.warning(`${tag} (queued)`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Pitchers</h3>
        <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Cancel" : "+ Add"}
        </Button>
      </div>

      {showAdd && (
        <div className="space-y-2 rounded-xl border bg-card p-4">
          <div>
            <Label htmlFor="pj">Jersey #</Label>
            <Input id="pj" value={jersey} onChange={(e) => setJersey(e.target.value)} className="mt-1" />
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

      {pitchers.map((p) => (
        <div key={p.id} className="rounded-xl border bg-card p-4">
          <button
            type="button"
            onClick={() => setActive(p.id)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <p className="font-semibold">
                #{p.jersey_number} {p.name && <span className="text-muted-foreground">— {p.name}</span>}
              </p>
              {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
            </div>
            {p.is_active ? (
              <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                Active
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Tap to activate</span>
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
      ))}
    </div>
  );
}
