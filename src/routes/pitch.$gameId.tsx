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
  Users,
  GripVertical,
  Lock,
  Unlock,
  Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { usePitchEntries } from "@/hooks/usePitchEntries";
import { usePitchLineup, type LineupSlot } from "@/hooks/usePitchLineup";
import { useCurrentBatter } from "@/hooks/useCurrentBatter";
import { makeBatterKey, type PitchEntryRow } from "@/lib/pitchIntel/types";
import { PitcherFatigueBar } from "@/components/pitch/PitcherFatigueBar";
import { BatterEditDialog } from "@/components/pitch/BatterEditDialog";
import { ScoreboardBanner } from "@/components/pitch/ScoreboardBanner";
import { NextBatterBanner } from "@/components/pitch/NextBatterBanner";
import { PitcherManagerDialog, type ManagedPitcher } from "@/components/pitch/PitcherManagerDialog";

interface GameRow {
  id: string;
  home_team: string;
  away_team: string;
  current_inning: number;
  home_score: number;
  away_score: number;
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
  const [pitchers, setPitchers] = useState<ManagedPitcher[]>([]);
  const [activePitcherId, setActivePitcherId] = useState<string>("");
  const [inning, setInning] = useState(1);
  const [batterTeam, setBatterTeam] = useState<string>("");
  const [outs, setOuts] = useState(0);
  const [pitcherMgrOpen, setPitcherMgrOpen] = useState(false);

  const { entries } = usePitchEntries(gameId);
  const { lineup, add, update, remove, substitute } = usePitchLineup(gameId, batterTeam);
  const { index: currentBatterIndex, setIndex: setCurrentBatterIndex } = useCurrentBatter(
    gameId,
    batterTeam,
    lineup.length,
  );

  const [editSlot, setEditSlot] = useState<LineupSlot | null>(null);
  const [subSlot, setSubSlot] = useState<LineupSlot | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: g } = await supabase
        .from("games")
        .select("id,home_team,away_team,current_inning,home_score,away_score")
        .eq("id", gameId)
        .maybeSingle();
      if (!g) return;
      setGame(g as GameRow);
      setInning(g.current_inning ?? 1);
      setBatterTeam((prev) => prev || g.away_team);

      const { data: ps } = await supabase
        .from("pitchers")
        .select("id,jersey_number,name,is_active")
        .eq("game_id", gameId);
      const list = (ps ?? []) as ManagedPitcher[];
      setPitchers(list);
      const active = list.find((p) => p.is_active) ?? list[0];
      if (active) setActivePitcherId(active.id);
    })();
  }, [gameId]);

  // Reset outs when inning changes
  useEffect(() => {
    setOuts(0);
  }, [inning, batterTeam]);

  const activePitcher = pitchers.find((p) => p.id === activePitcherId);
  const pitchCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of entries) m[e.pitcher_id] = (m[e.pitcher_id] ?? 0) + 1;
    return m;
  }, [entries]);
  const totalPitchesThisPitcher = pitchCounts[activePitcherId] ?? 0;

  const switchPitcher = async (id: string) => {
    setActivePitcherId(id);
    setPitchers((prev) => prev.map((p) => ({ ...p, is_active: p.id === id })));
    await Promise.all([
      supabase.from("pitchers").update({ is_active: false }).eq("game_id", gameId),
      supabase.from("pitchers").update({ is_active: true }).eq("id", id),
    ]);
  };

  const addPitcher = async ({ jersey, name }: { jersey: string; name?: string }) => {
    if (!game) return;
    const { data, error } = await supabase
      .from("pitchers")
      .insert({
        game_id: gameId,
        jersey_number: jersey,
        name: name ?? null,
        team_side: batterTeam === game.away_team ? "away" : "home",
        is_active: pitchers.length === 0,
      })
      .select("id,jersey_number,name,is_active")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setPitchers((prev) => [...prev, data as ManagedPitcher]);
    if (!activePitcherId) setActivePitcherId(data.id);
  };

  const updatePitcher = async (id: string, patch: { jersey: string; name?: string }) => {
    const { error } = await supabase
      .from("pitchers")
      .update({ jersey_number: patch.jersey, name: patch.name ?? null })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPitchers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, jersey_number: patch.jersey, name: patch.name ?? null } : p)),
    );
  };

  const removePitcher = async (id: string) => {
    const { error } = await supabase.from("pitchers").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPitchers((prev) => prev.filter((p) => p.id !== id));
    if (id === activePitcherId) {
      const next = pitchers.find((p) => p.id !== id);
      if (next) await switchPitcher(next.id);
      else setActivePitcherId("");
    }
  };

  const changeScore = async (side: "home" | "away", delta: number) => {
    if (!game) return;
    const next = Math.max(0, (side === "home" ? game.home_score : game.away_score) + delta);
    const patch = side === "home" ? { home_score: next } : { away_score: next };
    setGame({ ...game, ...patch });
    await supabase.from("games").update(patch).eq("id", gameId);
  };

  const changeInning = async (v: number) => {
    setInning(v);
    if (game) {
      setGame({ ...game, current_inning: v });
      await supabase.from("games").update({ current_inning: v }).eq("id", gameId);
    }
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

  const isTop = batterTeam === game.away_team;
  const pitcherLabel = activePitcher
    ? `#${activePitcher.jersey_number}${activePitcher.name ? ` ${activePitcher.name}` : ""}`
    : undefined;

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

      <ScoreboardBanner
        homeTeam={game.home_team}
        awayTeam={game.away_team}
        homeScore={game.home_score}
        awayScore={game.away_score}
        inning={inning}
        isTop={isTop}
        outs={outs}
        pitcherLabel={pitcherLabel}
        pitchCount={totalPitchesThisPitcher}
        onChangeScore={changeScore}
        onChangeOuts={(d) => setOuts((o) => Math.max(0, Math.min(3, o + d)))}
      />

      <NextBatterBanner gameId={gameId} team={batterTeam} lineup={lineup} index={currentBatterIndex} />

      <div className="mb-3 grid grid-cols-3 gap-2">
        <div>
          <Label className="text-[10px] uppercase">Inning</Label>
          <Select value={String(inning)} onValueChange={(v) => void changeInning(Number(v))}>
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

      <div className="mb-3 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPitcherMgrOpen(true)}
          className="h-9 gap-1 text-xs"
        >
          <Users className="h-3.5 w-3.5" /> Manage pitchers
        </Button>
        {pitchers.length === 0 && (
          <span className="text-xs text-muted-foreground">Add a pitcher to start logging</span>
        )}
      </div>

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
        {lineup.map((slot, i) => (
          <li key={slot.slotId}>
            <BatterCard
              gameId={gameId}
              batterTeam={batterTeam}
              slot={slot}
              entries={entries}
              isCurrent={i === currentBatterIndex}
              onTapToCurrent={() => setCurrentBatterIndex(i)}
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

      <Link to="/pitch/codes" className="mt-6 block text-center text-xs text-primary hover:underline">
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

      <PitcherManagerDialog
        open={pitcherMgrOpen}
        onClose={() => setPitcherMgrOpen(false)}
        pitchers={pitchers}
        pitchCounts={pitchCounts}
        onAdd={addPitcher}
        onUpdate={updatePitcher}
        onMakeActive={switchPitcher}
        onRemove={removePitcher}
      />
    </div>
  );
}

function BatterCard({
  gameId,
  batterTeam,
  slot,
  entries,
  isCurrent,
  onTapToCurrent,
  onEdit,
  onSub,
  onRemove,
}: {
  gameId: string;
  batterTeam: string;
  slot: LineupSlot;
  entries: PitchEntryRow[];
  isCurrent: boolean;
  onTapToCurrent: () => void;
  onEdit: () => void;
  onSub: () => void;
  onRemove: () => void;
}) {
  const slotKey = makeBatterKey(batterTeam, `slot:${slot.slotId}`);
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

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Link
      to="/pitch/$gameId/batter/$batterKey"
      params={{ gameId, batterKey: encodeURIComponent(slotKey) }}
      onClick={onTapToCurrent}
      className={`relative block rounded-2xl border bg-card shadow-sm transition active:scale-[0.99] ${
        isCurrent ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary"
      }`}
    >
      <div className="flex items-center gap-3 p-4 pr-2">
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
            {isCurrent && (
              <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                At bat
              </span>
            )}
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
      </div>

      <div className="flex items-center justify-end gap-1 border-t border-border/60 px-2 py-1.5">
        <button
          type="button"
          onClick={(e) => { stop(e); onEdit(); }}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button
          type="button"
          onClick={(e) => { stop(e); onSub(); }}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
        >
          <Repeat className="h-3.5 w-3.5" /> Sub
        </button>
        <button
          type="button"
          onClick={(e) => { stop(e); onRemove(); }}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" /> Remove
        </button>
      </div>
    </Link>
  );
}
