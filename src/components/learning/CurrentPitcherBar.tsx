import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOfflineWriter } from "@/hooks/useOfflineWriter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export type TeamSide = "my_team" | "opponent";

export interface CurrentPitcher {
  id: string;
  jersey_number: string;
  team_side: TeamSide;
}

interface PitcherRow {
  id: string;
  jersey_number: string;
  team_side: TeamSide | null;
}

export function CurrentPitcherBar({
  gameId,
  homeTeam,
  awayTeam,
  current,
  onChange,
}: {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  current: CurrentPitcher | null;
  onChange: (p: CurrentPitcher | null) => void;
}) {
  const { write } = useOfflineWriter();
  const [pitchers, setPitchers] = useState<PitcherRow[]>([]);
  const [open, setOpen] = useState(false);
  const [jersey, setJersey] = useState("");
  const [side, setSide] = useState<TeamSide | null>(null);
  const [saving, setSaving] = useState(false);

  const teamLabel = useCallback(
    (s: TeamSide | null) =>
      s === "my_team" ? homeTeam : s === "opponent" ? awayTeam : "Unknown",
    [homeTeam, awayTeam],
  );

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("pitchers")
      .select("id, jersey_number, team_side")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });
    setPitchers((data as PitcherRow[] | null) ?? []);
  }, [gameId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const resetSheet = () => {
    setJersey("");
    setSide(null);
    setSaving(false);
  };

  const handleSave = async () => {
    const j = jersey.trim();
    if (!j || !side) return;
    setSaving(true);

    // Duplicate guard: query before insert.
    const { data: existing } = await supabase
      .from("pitchers")
      .select("id, jersey_number, team_side")
      .eq("game_id", gameId)
      .eq("jersey_number", j)
      .eq("team_side", side)
      .maybeSingle();

    if (existing) {
      const row = existing as PitcherRow;
      toast.message("Pitcher already exists — selected");
      onChange({ id: row.id, jersey_number: row.jersey_number, team_side: side });
      await reload();
      setOpen(false);
      resetSheet();
      return;
    }

    const newId = crypto.randomUUID();
    const res = await write("pitchers", {
      id: newId,
      game_id: gameId,
      jersey_number: j,
      team_side: side,
      is_active: true,
    });

    if (res.ok) {
      toast.success(`Pitcher #${j} added`);
    } else {
      toast.warning(`Pitcher #${j} queued (offline)`);
    }
    // Optimistic local insert + select
    setPitchers((prev) => [...prev, { id: newId, jersey_number: j, team_side: side }]);
    onChange({ id: newId, jersey_number: j, team_side: side });
    setOpen(false);
    resetSheet();
    // Best-effort refresh from server (no-op offline)
    reload();
  };

  const handleSelect = (id: string) => {
    const p = pitchers.find((x) => x.id === id);
    if (!p || !p.team_side) return;
    onChange({ id: p.id, jersey_number: p.jersey_number, team_side: p.team_side });
  };

  // Only show pitchers that have a team_side (Learning-mode entries).
  const selectablePitchers = pitchers.filter((p) => p.team_side !== null);

  return (
    <section className="rounded-xl border bg-card p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Current pitcher
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select value={current?.id ?? ""} onValueChange={handleSelect}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select pitcher…" />
            </SelectTrigger>
            <SelectContent>
              {selectablePitchers.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No pitchers yet. Add one →
                </div>
              ) : (
                selectablePitchers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    #{p.jersey_number} · {teamLabel(p.team_side)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 shrink-0"
          onClick={() => setOpen(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          New
        </Button>
      </div>

      <Sheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) resetSheet();
        }}
      >
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Add pitcher</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 pb-4">
            <div>
              <Label htmlFor="pitcher-jersey" className="text-sm font-semibold">
                Jersey #
              </Label>
              <Input
                id="pitcher-jersey"
                inputMode="numeric"
                value={jersey}
                onChange={(e) => setJersey(e.target.value)}
                placeholder="e.g. 22"
                className="mt-1 h-11"
              />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold">Team</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={side === "my_team" ? "default" : "outline"}
                  onClick={() => setSide("my_team")}
                  className="h-11"
                >
                  {homeTeam}
                </Button>
                <Button
                  type="button"
                  variant={side === "opponent" ? "default" : "outline"}
                  onClick={() => setSide("opponent")}
                  className="h-11"
                >
                  {awayTeam}
                </Button>
              </div>
            </div>
            <Button
              onClick={handleSave}
              className="w-full h-11"
              disabled={!jersey.trim() || !side || saving}
            >
              Save pitcher
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
