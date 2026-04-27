import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ProtectedShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, UserCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

import { usePitchTypes } from "@/hooks/usePitchTypes";
import { usePitchEntries } from "@/hooks/usePitchEntries";
import { usePitchCodeMap } from "@/hooks/usePitchCodeMap";
import { applyPitch } from "@/lib/pitchIntel/countEngine";
import { makeBatterKey, type AbResult, type ContactQuality, type PitchResult, type SprayZone } from "@/lib/pitchIntel/types";

import { PitcherFatigueBar } from "@/components/pitch/PitcherFatigueBar";
import { LineupStrip } from "@/components/pitch/LineupStrip";
import { PreviousPABanner } from "@/components/pitch/PreviousPABanner";
import { CountDisplay } from "@/components/pitch/CountDisplay";
import { CodeEntry } from "@/components/pitch/CodeEntry";
import { ResultPad } from "@/components/pitch/ResultPad";
import { SprayChartModal } from "@/components/pitch/SprayChartModal";
import { AbResultPicker } from "@/components/pitch/AbResultPicker";
import { RecommendationBox } from "@/components/pitch/RecommendationBox";

interface PitcherRow {
  id: string;
  jersey_number: string;
  name: string | null;
  team_side: string | null;
}

interface GameRow {
  id: string;
  home_team: string;
  away_team: string;
  current_inning: number;
}

export const Route = createFileRoute("/pitch/$gameId")({
  component: PitchLiveLoggerRoute,
});

function PitchLiveLoggerRoute() {
  return (
    <ProtectedShell>
      <PitchLiveLogger />
    </ProtectedShell>
  );
}

function PitchLiveLogger() {
  const { gameId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [game, setGame] = useState<GameRow | null>(null);
  const [pitchers, setPitchers] = useState<PitcherRow[]>([]);
  const [activePitcherId, setActivePitcherId] = useState<string>("");
  const [inning, setInning] = useState(1);
  const [batterTeam, setBatterTeam] = useState<string>("");

  const [lineup, setLineup] = useState<string[]>([]);
  const [activeBatterIdx, setActiveBatterIdx] = useState(0);

  const [code, setCode] = useState("");
  const [count, setCount] = useState({ balls: 0, strikes: 0 });
  const [paPitchSeq, setPaPitchSeq] = useState(0);
  const [atBatSeq, setAtBatSeq] = useState(1);

  const [sprayOpen, setSprayOpen] = useState(false);
  const [abPickerOpen, setAbPickerOpen] = useState(false);
  const [pendingAbResult, setPendingAbResult] = useState<AbResult | null>(null);
  const [lastPendingPitchId, setLastPendingPitchId] = useState<string | null>(null);

  const { types: pitchTypes } = usePitchTypes();
  const { entries, refresh: refreshEntries } = usePitchEntries(gameId);
  const { rows: codeMap, refresh: refreshCodes } = usePitchCodeMap(activePitcherId);

  // Load game + pitchers
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
      // default batter team = away (we usually scout the away/visitor)
      setBatterTeam((prev) => prev || g.away_team);

      const { data: ps } = await supabase
        .from("pitchers")
        .select("id,jersey_number,name,team_side,is_active")
        .eq("game_id", gameId);
      const list = (ps ?? []) as (PitcherRow & { is_active: boolean })[];
      setPitchers(list);
      const active = list.find((p) => p.is_active) ?? list[0];
      if (active) setActivePitcherId(active.id);
    })();
  }, [gameId]);

  const activePitcher = pitchers.find((p) => p.id === activePitcherId);
  const batterNumber = lineup[activeBatterIdx] ?? "";
  const batterKey = batterNumber ? makeBatterKey(batterTeam, batterNumber) : "";

  // Pitch count for the current PA
  useEffect(() => {
    if (!batterKey) return;
    const paCount = entries.filter(
      (e) => e.batter_key === batterKey && e.at_bat_seq === atBatSeq,
    ).length;
    setPaPitchSeq(paCount);
  }, [entries, batterKey, atBatSeq]);

  // Refresh codes when pitcher changes
  useEffect(() => {
    void refreshCodes();
  }, [activePitcherId, refreshCodes]);

  const totalPitchesThisPitcher = entries.filter((e) => e.pitcher_id === activePitcherId).length;

  // ----- Add pitcher inline -----
  const [addingPitcher, setAddingPitcher] = useState(false);
  const [newJersey, setNewJersey] = useState("");
  const [newName, setNewName] = useState("");
  const addPitcher = async () => {
    if (!newJersey.trim()) return;
    const { data, error } = await supabase
      .from("pitchers")
      .insert({
        game_id: gameId,
        jersey_number: newJersey.trim(),
        name: newName.trim() || null,
        team_side: batterTeam === game?.away_team ? "away" : "home",
        is_active: pitchers.length === 0,
      })
      .select("id,jersey_number,name,team_side,is_active")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    const next = [...pitchers, data as PitcherRow];
    setPitchers(next);
    if (!activePitcherId) setActivePitcherId(data.id);
    setNewJersey("");
    setNewName("");
    setAddingPitcher(false);
  };

  const switchPitcher = async (id: string) => {
    setActivePitcherId(id);
    // Mark active flag in DB (best-effort)
    await Promise.all([
      supabase.from("pitchers").update({ is_active: false }).eq("game_id", gameId),
      supabase.from("pitchers").update({ is_active: true }).eq("id", id),
    ]);
  };

  // ----- Log pitch -----
  const logPitch = async (result: PitchResult) => {
    if (!game || !user || !activePitcher || !batterKey || !batterNumber) {
      toast.error("Pick a pitcher and at least one batter first");
      return;
    }
    const outcome = applyPitch(count, result);
    const matched = codeMap.find((m) => m.numeric_code === code.trim());

    const insert = {
      game_id: gameId,
      inning,
      pitcher_id: activePitcherId,
      batter_key: batterKey,
      batter_team: batterTeam,
      batter_number: batterNumber,
      at_bat_seq: atBatSeq,
      pitch_seq: paPitchSeq + 1,
      numeric_code: code.trim() || null,
      pitch_type_id: matched?.pitch_type_id ?? null,
      result,
      balls_before: count.balls,
      strikes_before: count.strikes,
      balls_after: outcome.next.balls,
      strikes_after: outcome.next.strikes,
      spray_zone: null as SprayZone | null,
      contact_quality: null as ContactQuality | null,
      ab_result: null as AbResult | null,
      logged_by: user.id,
    };

    const { data, error } = await supabase
      .from("pitch_entries")
      .insert(insert)
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }

    setCount(outcome.next);
    setCode("");
    void refreshEntries();

    if (outcome.needsContact) {
      setLastPendingPitchId(data.id);
      setSprayOpen(true);
      return;
    }
    if (outcome.endsAtBat) {
      if (outcome.suggestedAbResult) {
        setLastPendingPitchId(data.id);
        setPendingAbResult(outcome.suggestedAbResult);
        setAbPickerOpen(true);
      } else {
        // caught_foul → just end
        await finalizeAtBat(data.id, "PO");
      }
    }
  };

  const finalizeAtBat = async (pitchId: string, ab: AbResult) => {
    await supabase.from("pitch_entries").update({ ab_result: ab }).eq("id", pitchId);
    void refreshEntries();
    setCount({ balls: 0, strikes: 0 });
    setAtBatSeq((s) => s + 1);
    // Advance to next batter in lineup
    if (lineup.length > 0) setActiveBatterIdx((i) => (i + 1) % lineup.length);
  };

  const handleSpraySubmit = async (data: { spray: SprayZone; contact: ContactQuality; abResult: AbResult }) => {
    if (!lastPendingPitchId) return;
    await supabase
      .from("pitch_entries")
      .update({
        spray_zone: data.spray,
        contact_quality: data.contact,
        ab_result: data.abResult,
      })
      .eq("id", lastPendingPitchId);
    setSprayOpen(false);
    void refreshEntries();
    setCount({ balls: 0, strikes: 0 });
    setAtBatSeq((s) => s + 1);
    if (lineup.length > 0) setActiveBatterIdx((i) => (i + 1) % lineup.length);
    setLastPendingPitchId(null);
  };

  const handleAbPick = async (r: AbResult) => {
    if (!lastPendingPitchId) return;
    await finalizeAtBat(lastPendingPitchId, r);
    setAbPickerOpen(false);
    setPendingAbResult(null);
    setLastPendingPitchId(null);
  };

  const inningOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  if (!game) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-6 text-sm text-muted-foreground">Loading game…</div>
    );
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

      {/* Inning + Pitcher + Batter team */}
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

      {/* Add pitcher inline */}
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

      {/* Fatigue */}
      {activePitcher && (
        <div className="mb-3">
          <PitcherFatigueBar
            entries={entries}
            pitcherId={activePitcherId}
            pitcherLabel={`#${activePitcher.jersey_number}${activePitcher.name ? ` ${activePitcher.name}` : ""}`}
          />
        </div>
      )}

      {/* Lineup */}
      <div className="mb-3">
        <LineupStrip
          team={batterTeam}
          lineup={lineup}
          activeIndex={activeBatterIdx}
          onSelect={(i) => {
            setActiveBatterIdx(i);
            setCount({ balls: 0, strikes: 0 });
            setAtBatSeq((s) => s + 1);
          }}
          onAdd={(j) => {
            setLineup((l) => [...l, j]);
            if (lineup.length === 0) setActiveBatterIdx(0);
          }}
          onRemove={(i) => {
            setLineup((l) => l.filter((_, idx) => idx !== i));
            if (activeBatterIdx >= i) setActiveBatterIdx((idx) => Math.max(0, idx - 1));
          }}
        />
      </div>

      {/* Now batting */}
      {batterNumber ? (
        <div className="mb-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Now batting</div>
              <div className="text-lg font-bold">#{batterNumber} · {batterTeam}</div>
            </div>
            <Link
              to="/pitch/$gameId/batter/$batterKey"
              params={{ gameId, batterKey: encodeURIComponent(batterKey) }}
              className="flex items-center gap-1 text-xs text-primary"
            >
              <UserCircle2 className="h-3.5 w-3.5" /> Profile
            </Link>
          </div>

          <div className="mb-2">
            <PreviousPABanner
              entries={entries}
              batterKey={batterKey}
              batterTeam={batterTeam}
              pitchTypes={pitchTypes}
            />
          </div>

          <div className="mb-2">
            <CountDisplay
              balls={count.balls}
              strikes={count.strikes}
              paPitches={paPitchSeq}
              totalPitches={totalPitchesThisPitcher}
            />
          </div>
        </div>
      ) : (
        <div className="mb-3 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Add a batter to start logging.
        </div>
      )}

      {/* Recommendation */}
      {batterNumber && activePitcherId && (
        <div className="mb-3">
          <RecommendationBox
            pitchTypes={pitchTypes}
            entries={entries}
            batterKey={batterKey}
            batterTeam={batterTeam}
            pitcherId={activePitcherId}
            balls={count.balls}
            strikes={count.strikes}
          />
        </div>
      )}

      {/* Code entry + result pad */}
      <div className="space-y-2">
        <CodeEntry codeMap={codeMap} pitchTypes={pitchTypes} value={code} onChange={setCode} />
        <ResultPad onPick={logPitch} disabled={!batterNumber || !activePitcherId} />
      </div>

      <SprayChartModal
        open={sprayOpen}
        onClose={() => setSprayOpen(false)}
        onSubmit={handleSpraySubmit}
      />
      <AbResultPicker
        open={abPickerOpen}
        suggested={pendingAbResult}
        onPick={handleAbPick}
        onClose={() => setAbPickerOpen(false)}
      />
    </div>
  );
}
