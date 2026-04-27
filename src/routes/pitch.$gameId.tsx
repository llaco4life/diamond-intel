import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ProtectedShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronLeft,
  Plus,
  X,
  AlertTriangle,
  ChevronRight,
  Pencil,
  Repeat,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { usePitchEntries } from "@/hooks/usePitchEntries";
import { usePitchLineup, type LineupSlot } from "@/hooks/usePitchLineup";
import { makeBatterKey, type PitchEntryRow } from "@/lib/pitchIntel/types";
import { PitcherFatigueBar } from "@/components/pitch/PitcherFatigueBar";
import { BatterEditDialog } from "@/components/pitch/BatterEditDialog";

interface PitcherRow {
  id: string;
  jersey_number: string;
  name: string | null;
  team_side: string | null;
  is_active: boolean;
}

interface GameRow {
  id: string;
  home_team: string;
  away_team: string;
  current_inning: number;
}

export const Route = createFileRoute("/pitch/$gameId")({
  component: PitchGameRoute,
});

function PitchGameRoute() {
  return (
    <ProtectedShell>
      <PitchGameScreen />
    </ProtectedShell>
  );
}

function PitchGameScreen() {
  const { gameId } = Route.useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState<GameRow | null>(null);
  const [pitchers, setPitchers] = useState<PitcherRow[]>([]);
  const [activePitcherId, setActivePitcherId] = useState<string>("");
  const [inning, setInning] = useState(1);
  const [batterTeam, setBatterTeam] = useState<string>("");

  const { entries } = usePitchEntries(gameId);
  const { lineup, add, update, remove, substitute } = usePitchLineup(gameId, batterTeam);

  // Dialog state
  const [editSlot, setEditSlot] = useState<LineupSlot | null>(null);
  const [subSlot, setSubSlot] = useState<LineupSlot | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: g } = await supabase
        .from("games")
        .select("id,home_team,away_team,current_inning")
        .eq("id", gameId)
        .maybeSingle();
      if (!g) return;
      setGame(g as GameRow);
      setInning(g.current_inning ?? 1);
      setBatterTeam((prev) => prev || g.away_team);

      const { data: ps } = await supabase
        .from("pitchers")
        .select("id,jersey_number,name,team_side,is_active")
        .eq("game_id", gameId);
      const list = (ps ?? []) as PitcherRow[];
      setPitchers(list);
      const active = list.find((p) => p.is_active) ?? list[0];
      if (active) setActivePitcherId(active.id);
    })();
  }, [gameId]);

  const activePitcher = pitchers.find((p) => p.id === activePitcherId);
  const totalPitchesThisPitcher = entries.filter((e) => e.pitcher_id === activePitcherId).length;

  const switchPitcher = async (id: string) => {
    setActivePitcherId(id);
    await Promise.all([
      supabase.from("pitchers").update({ is_active: false }).eq("game_id", gameId),
      supabase.from("pitchers").update({ is_active: true }).eq("id", id),
    ]);
  };

  // Add pitcher
  const [addingPitcher, setAddingPitcher] = useState(false);
  const [newJersey, setNewJersey] = useState("");
  const [newName, setNewName] = useState("");
  const addPitcher = async () => {
    if (!newJersey.trim() || !game) return;
    const { data, error } = await supabase
      .from("pitchers")
      .insert({
        game_id: gameId,
        jersey_number: newJersey.trim(),
        name: newName.trim() || null,
        team_side: batterTeam === game.away_team ? "away" : "home",
        is_active: pitchers.length === 0,
      })
      .select("id,jersey_number,name,team_side,is_active")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setPitchers((prev) => [...prev, data as PitcherRow]);
    if (!activePitcherId) setActivePitcherId(data.id);
    setNewJersey("");
    setNewName("");
    setAddingPitcher(false);
  };

  // Add batter
  const [newBatterJersey, setNewBatterJersey] = useState("");
  const [newBatterName, setNewBatterName] = useState("");
  const inningOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const handleDeleteSlot = (slot: LineupSlot) => {
    const label = `#${slot.jersey}${slot.name ? ` ${slot.name}` : ""}`;
    if (!window.confirm(`Remove ${label} from the lineup? Their logged at-bats stay in history.`)) return;
    remove(slot.slotId);
  };

  if (!game) {
    return <div className="mx-auto max-w-2xl px-4 pt-6 text-sm text-muted-foreground">Loading game…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-6">
      <header className="mb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/pitch" })}
          className="-ml-2 h-8 gap-1 px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Pitch Intel
        </Button>
        <div className="text-xs text-muted-foreground">
          {game.home_team} vs {game.away_team}
        </div>
      </header>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <div>
          <Label className="text-[10px] uppercase">Inning</Label>
          <Select value={String(inning)} onValueChange={(v) => setInning(Number(v))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {inningOptions.map((i) => <SelectItem key={i} value={String(i)}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase">Pitcher</Label>
          <Select value={activePitcherId} onValueChange={switchPitcher}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Pick" /></SelectTrigger>
            <SelectContent>
              {pitchers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  #{p.jersey_number}{p.name ? ` ${p.name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase">Batter team</Label>
          <Select value={batterTeam} onValueChange={setBatterTeam}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={game.home_team}>{game.home_team}</SelectItem>
              <SelectItem value={game.away_team}>{game.away_team}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {pitchers.length === 0 || addingPitcher ? (
        <div className="mb-3 space-y-2 rounded-xl border border-dashed border-border p-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            {pitchers.length === 0 ? "Add the first pitcher" : "Add a pitcher"}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="#"
              value={newJersey}
              onChange={(e) => setNewJersey(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
              className="w-16 text-center font-bold"
              inputMode="numeric"
            />
            <Input placeholder="name (optional)" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Button onClick={addPitcher}>Add</Button>
          </div>
          {pitchers.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setAddingPitcher(false)}>Cancel</Button>
          )}
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setAddingPitcher(true)} className="mb-3 text-xs">
          + Add pitcher
        </Button>
      )}

      {activePitcher && (
        <div className="mb-4">
          <PitcherFatigueBar
            entries={entries}
            pitcherId={activePitcherId}
            pitcherLabel={`#${activePitcher.jersey_number}${activePitcher.name ? ` ${activePitcher.name}` : ""} · ${totalPitchesThisPitcher} pitches`}
          />
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Lineup · {batterTeam}
        </h2>
        <span className="text-[10px] text-muted-foreground">Tap a batter to log</span>
      </div>

      <ul className="space-y-2">
        {lineup.map((slot) => (
          <li key={slot.slotId}>
            <BatterCard
              gameId={gameId}
              batterTeam={batterTeam}
              slot={slot}
              entries={entries}
              onEdit={() => setEditSlot(slot)}
              onSub={() => setSubSlot(slot)}
              onRemove={() => handleDeleteSlot(slot)}
            />
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-border p-3">
        <div>
          <Label className="text-[10px] uppercase">Jersey</Label>
          <Input
            value={newBatterJersey}
            onChange={(e) => setNewBatterJersey(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
            placeholder="#"
            className="h-10 w-20 text-center font-bold"
            inputMode="numeric"
          />
        </div>
        <div className="min-w-[10rem] flex-1">
          <Label className="text-[10px] uppercase">Name (optional)</Label>
          <Input
            value={newBatterName}
            onChange={(e) => setNewBatterName(e.target.value)}
            placeholder="e.g. Smith"
            className="h-10"
          />
        </div>
        <Button
          onClick={() => {
            if (!newBatterJersey.trim()) return;
            add(newBatterJersey.trim(), newBatterName);
            setNewBatterJersey("");
            setNewBatterName("");
          }}
          className="h-10 gap-1"
        >
          <Plus className="h-4 w-4" /> Add batter
        </Button>
      </div>

      {lineup.length === 0 && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Add the opponent's lineup to start tracking.
        </p>
      )}

      <div className="mt-6 text-center text-[11px] text-muted-foreground">
        Pitch logging happens inside each batter card.
      </div>

      <Link to="/pitch/codes" className="mt-2 block text-center text-xs text-primary hover:underline">
        Manage pitcher codes
      </Link>

      {editSlot && (
        <BatterEditDialog
          mode="edit"
          open={!!editSlot}
          slot={editSlot}
          onClose={() => setEditSlot(null)}
          onSave={(patch) => update(editSlot.slotId, patch)}
        />
      )}
      {subSlot && (
        <BatterEditDialog
          mode="sub"
          open={!!subSlot}
          slot={subSlot}
          inning={inning}
          onClose={() => setSubSlot(null)}
          onSave={(data) => {
            substitute(subSlot.slotId, data);
            toast.success(`Subbed in #${data.jersey}${data.name ? ` ${data.name}` : ""}`);
          }}
        />
      )}
    </div>
  );
}

function BatterCard({
  gameId,
  batterTeam,
  slot,
  entries,
  onEdit,
  onSub,
  onRemove,
}: {
  gameId: string;
  batterTeam: string;
  slot: LineupSlot;
  entries: PitchEntryRow[];
  onEdit: () => void;
  onSub: () => void;
  onRemove: () => void;
}) {
  const slotKey = makeBatterKey(batterTeam, `slot:${slot.slotId}`);
  // Match entries by new slot key OR any legacy jersey this slot used
  const allKeys = new Set<string>([
    slotKey,
    ...slot.legacyJerseys.map((j) => makeBatterKey(batterTeam, j)),
    makeBatterKey(batterTeam, slot.jersey),
  ]);
  const myEntries = entries.filter((e) => allKeys.has(e.batter_key));

  const byAb = new Map<number, PitchEntryRow[]>();
  for (const e of myEntries) {
    const arr = byAb.get(e.at_bat_seq) ?? [];
    arr.push(e);
    byAb.set(e.at_bat_seq, arr);
  }
  const sortedAbSeqs = Array.from(byAb.keys()).sort((a, b) => b - a);
  let lastCompletePa: PitchEntryRow[] | null = null;
  let activePa: PitchEntryRow[] | null = null;
  for (const seq of sortedAbSeqs) {
    const arr = byAb.get(seq)!;
    if (arr.some((p) => p.ab_result)) {
      if (!lastCompletePa) lastCompletePa = arr;
    } else if (!activePa) {
      activePa = arr;
    }
  }
  const lastResult = lastCompletePa?.find((p) => p.ab_result);
  const hardContact = lastResult?.contact_quality === "hard" || lastResult?.contact_quality === "barrel";
  const totalPas = sortedAbSeqs.filter((s) => byAb.get(s)!.some((p) => p.ab_result)).length;

  const lastSub = slot.subs[slot.subs.length - 1];
  const display = `#${slot.jersey}${slot.name ? ` ${slot.name}` : ""}`;

  return (
    <div className="group rounded-2xl border border-border bg-card shadow-sm transition hover:border-primary">
      <Link
        to="/pitch/$gameId/batter/$batterKey"
        params={{ gameId, batterKey: encodeURIComponent(slotKey) }}
        className="flex items-center gap-3 p-4 active:scale-[0.99]"
      >
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <span className="text-[9px] font-bold opacity-80">#{slot.order}</span>
          <span className="text-lg font-black tabular-nums leading-none">#{slot.jersey}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold">
              {slot.name ? slot.name : `#${slot.jersey}`}
            </span>
            <span className="text-[10px] text-muted-foreground">{batterTeam}</span>
            <span className="text-[10px] text-muted-foreground">{totalPas} PA</span>
            {activePa && (
              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                Live
              </span>
            )}
            {hardContact && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-300">
                <AlertTriangle className="h-3 w-3" /> hard contact
              </span>
            )}
          </div>

          {lastSub && (
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              Subbed in for #{lastSub.jersey}{lastSub.name ? ` ${lastSub.name}` : ""} — Inning {lastSub.inning}
              {lastSub.note ? ` · ${lastSub.note}` : ""}
            </div>
          )}

          <div className="mt-1 text-xs text-muted-foreground">
            {lastResult ? (
              <>
                Last: <span className="font-mono font-semibold text-foreground">{lastResult.ab_result}</span>
                {lastResult.spray_zone ? ` → ${lastResult.spray_zone}` : ""}
                {lastResult.contact_quality ? ` · ${lastResult.contact_quality}` : ""}
              </>
            ) : (
              <>No prior at-bat</>
            )}
          </div>
          {slot.note && (
            <div className="mt-0.5 text-[10px] italic text-muted-foreground">{slot.note}</div>
          )}
        </div>

        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </Link>

      <div className="flex items-center justify-end gap-1 border-t border-border/60 px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-8 gap-1 px-2 text-xs text-muted-foreground"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSub}
          className="h-8 gap-1 px-2 text-xs text-muted-foreground"
        >
          <Repeat className="h-3.5 w-3.5" /> Sub
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" /> Remove
        </Button>
      </div>
    </div>
  );
}
