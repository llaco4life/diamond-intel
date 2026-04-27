import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { ProtectedShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

import { usePitchEntries } from "@/hooks/usePitchEntries";
import { usePitchLineup } from "@/hooks/usePitchLineup";
import { makeBatterKey } from "@/lib/pitchIntel/types";
import { usePitchTypes } from "@/hooks/usePitchTypes";
import { usePitchCodeMap } from "@/hooks/usePitchCodeMap";
import { applyPitch } from "@/lib/pitchIntel/countEngine";
import {
  type AbResult,
  type ContactQuality,
  type PitchEntryRow,
  type PitchResult,
  type SprayZone,
} from "@/lib/pitchIntel/types";

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
  is_active: boolean;
}

interface GameRow {
  id: string;
  home_team: string;
  away_team: string;
  current_inning: number;
}

export const Route = createFileRoute("/pitch/$gameId/batter/$batterKey")({
  component: BatterProfileRoute,
});

function BatterProfileRoute() {
  return (
    <ProtectedShell>
      <BatterProfile />
    </ProtectedShell>
  );
}

function BatterProfile() {
  const { gameId, batterKey: rawKey } = Route.useParams();
  const batterKey = decodeURIComponent(rawKey);
  const parts = batterKey.split(":");
  const batterTeam = parts[0];
  // New form: team:slot:<slotId>  · Legacy form: team:<jersey>
  const isSlotKey = parts[1] === "slot";
  const slotId = isSlotKey ? parts.slice(2).join(":") : null;
  const navigate = useNavigate();
  const { user } = useAuth();

  const { lineup } = usePitchLineup(gameId, batterTeam);
  const slot = slotId ? lineup.find((s) => s.slotId === slotId) ?? null : null;
  const jersey = slot?.jersey ?? (isSlotKey ? "?" : parts[1]);
  const displayName = slot?.name;

  const [game, setGame] = useState<GameRow | null>(null);
  const [pitchers, setPitchers] = useState<PitcherRow[]>([]);
  const [activePitcherId, setActivePitcherId] = useState<string>("");

  const { types: pitchTypes } = usePitchTypes();
  const { entries, refresh } = usePitchEntries(gameId);
  const { rows: codeMap } = usePitchCodeMap(activePitcherId);

  // Load game + active pitcher
  useEffect(() => {
    void (async () => {
      const { data: g } = await supabase
        .from("games")
        .select("id,home_team,away_team,current_inning")
        .eq("id", gameId)
        .maybeSingle();
      if (g) setGame(g as GameRow);

      const { data: ps } = await supabase
        .from("pitchers")
        .select("id,jersey_number,name,is_active")
        .eq("game_id", gameId);
      const list = (ps ?? []) as PitcherRow[];
      setPitchers(list);
      const active = list.find((p) => p.is_active) ?? list[0];
      if (active) setActivePitcherId(active.id);
    })();
  }, [gameId]);

  const myEntries = useMemo(() => {
    const keys = new Set<string>([batterKey]);
    if (slot) {
      keys.add(makeBatterKey(batterTeam, `slot:${slot.slotId}`));
      keys.add(makeBatterKey(batterTeam, slot.jersey));
      for (const j of slot.legacyJerseys) keys.add(makeBatterKey(batterTeam, j));
    }
    return entries.filter((e) => keys.has(e.batter_key));
  }, [entries, batterKey, batterTeam, slot]);

  // Group into PAs
  const pas = useMemo(() => groupPAs(myEntries), [myEntries]);
  const activePa = pas.find((p) => !p.complete) ?? null;
  const completePas = pas.filter((p) => p.complete);

  // Live count derives from active PA
  const lastPitch = activePa?.pitches[activePa.pitches.length - 1];
  const count = {
    balls: lastPitch?.balls_after ?? 0,
    strikes: lastPitch?.strikes_after ?? 0,
  };
  const paPitchSeq = activePa?.pitches.length ?? 0;

  // at_bat_seq for the next pitch we'll log
  const nextAtBatSeq = activePa
    ? activePa.atBatSeq
    : (myEntries.reduce((m, e) => Math.max(m, e.at_bat_seq), 0) + 1);

  const [code, setCode] = useState("");
  const [sprayOpen, setSprayOpen] = useState(false);
  const [abPickerOpen, setAbPickerOpen] = useState(false);
  const [pendingAbResult, setPendingAbResult] = useState<AbResult | null>(null);
  const [lastPendingPitchId, setLastPendingPitchId] = useState<string | null>(null);

  const activePitcher = pitchers.find((p) => p.id === activePitcherId);
  const totalPitchesThisPitcher = entries.filter((e) => e.pitcher_id === activePitcherId).length;

  // ----- Log pitch -----
  const logPitch = async (result: PitchResult) => {
    if (!game || !user || !activePitcher) {
      toast.error("Pick a pitcher on the lineup screen first");
      return;
    }
    const outcome = applyPitch(count, result);
    const matched = codeMap.find((m) => m.numeric_code === code.trim());

    const insert = {
      game_id: gameId,
      inning: game.current_inning ?? 1,
      pitcher_id: activePitcherId,
      batter_key: batterKey,
      batter_team: batterTeam,
      batter_number: jersey,
      at_bat_seq: nextAtBatSeq,
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

    setCode("");
    void refresh();

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
        await supabase.from("pitch_entries").update({ ab_result: "PO" }).eq("id", data.id);
        void refresh();
      }
    }
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
    void refresh();
    setLastPendingPitchId(null);
    toast.success("At-bat saved");
  };

  const handleAbPick = async (r: AbResult) => {
    if (!lastPendingPitchId) return;
    await supabase.from("pitch_entries").update({ ab_result: r }).eq("id", lastPendingPitchId);
    void refresh();
    setAbPickerOpen(false);
    setPendingAbResult(null);
    setLastPendingPitchId(null);
    toast.success("At-bat saved");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-6">
      <header className="mb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/pitch/$gameId", params: { gameId } })}
          className="-ml-2 h-8 gap-1 px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Lineup
        </Button>
        <div className="text-xs text-muted-foreground">
          {game ? `${game.home_team} vs ${game.away_team}` : ""}
        </div>
      </header>

      <div className="mb-3 rounded-2xl border border-primary/40 bg-primary/5 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <span className="text-xl font-black tabular-nums">#{jersey}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold">
              {displayName ? `${displayName} ` : ""}<span className="text-muted-foreground">· {batterTeam}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {activePitcher
                ? `vs #${activePitcher.jersey_number}${activePitcher.name ? ` ${activePitcher.name}` : ""} · ${totalPitchesThisPitcher} pitches`
                : "No pitcher selected"}
            </div>
          </div>
        </div>
        {slot && slot.subs.length > 0 && (
          <div className="mt-2 space-y-0.5 border-t border-primary/20 pt-2 text-[11px] text-muted-foreground">
            <div className="font-semibold uppercase text-[10px]">Previous occupants</div>
            {slot.subs.map((s, i) => (
              <div key={i}>
                #{s.jersey}{s.name ? ` ${s.name}` : ""} — Inning {s.inning}
                {s.note ? ` · ${s.note}` : ""}
              </div>
            ))}
          </div>
        )}
      </div>

      <Tabs defaultValue="current">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">Current At-Bat</TabsTrigger>
          <TabsTrigger value="previous">Previous</TabsTrigger>
          <TabsTrigger value="spray">Spray Chart</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-3 space-y-3">
          {!activePitcher && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              Add or select a pitcher on the lineup screen before logging.
            </div>
          )}

          <CountDisplay
            balls={count.balls}
            strikes={count.strikes}
            paPitches={paPitchSeq}
            totalPitches={totalPitchesThisPitcher}
          />

          {activePitcher && (
            <RecommendationBox
              pitchTypes={pitchTypes}
              entries={entries}
              batterKey={batterKey}
              batterTeam={batterTeam}
              pitcherId={activePitcherId}
              balls={count.balls}
              strikes={count.strikes}
            />
          )}

          <CodeEntry codeMap={codeMap} pitchTypes={pitchTypes} value={code} onChange={setCode} />
          <ResultPad onPick={logPitch} disabled={!activePitcher} />

          {activePa && activePa.pitches.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-3 text-xs">
              <div className="mb-1 font-semibold uppercase text-muted-foreground">This PA pitch log</div>
              {activePa.pitches.map((p, i) => (
                <div key={p.id} className="font-mono">
                  {i + 1}. {p.balls_before}-{p.strikes_before} → {p.result.replace("_", " ")} ({p.balls_after}-{p.strikes_after})
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="previous" className="mt-3 space-y-2">
          {completePas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed at-bats yet.</p>
          ) : (
            completePas.map((pa) => <PaCard key={pa.id} pa={pa} pitchTypes={pitchTypes} />)
          )}
        </TabsContent>

        <TabsContent value="spray" className="mt-3">
          <SprayChartView entries={myEntries.filter((e) => e.spray_zone)} />
        </TabsContent>
      </Tabs>

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

interface PA {
  id: string;
  inning: number;
  atBatSeq: number;
  pitches: PitchEntryRow[];
  complete: boolean;
  abResult: string | null;
  contactQuality: string | null;
  sprayZone: string | null;
  date: string;
}

function groupPAs(entries: PitchEntryRow[]): PA[] {
  const map = new Map<number, PA>();
  for (const e of entries) {
    let pa = map.get(e.at_bat_seq);
    if (!pa) {
      pa = {
        id: String(e.at_bat_seq),
        inning: e.inning,
        atBatSeq: e.at_bat_seq,
        pitches: [],
        complete: false,
        abResult: null,
        contactQuality: null,
        sprayZone: null,
        date: e.created_at,
      };
      map.set(e.at_bat_seq, pa);
    }
    pa.pitches.push(e);
    if (e.ab_result) {
      pa.complete = true;
      pa.abResult = e.ab_result;
      pa.contactQuality = e.contact_quality;
      pa.sprayZone = e.spray_zone;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.atBatSeq - a.atBatSeq);
}

function PaCard({ pa, pitchTypes }: { pa: PA; pitchTypes: { id: string; label: string }[] }) {
  const labelMap = new Map(pitchTypes.map((p) => [p.id, p.label]));
  const seq = pa.pitches
    .map((p) => (p.pitch_type_id ? labelMap.get(p.pitch_type_id)?.split(" ")[0] : "?"))
    .join(" → ");
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>Inning {pa.inning} · PA {pa.atBatSeq}</span>
        <span className="font-mono font-semibold text-foreground">{pa.abResult ?? "—"}</span>
      </div>
      <div className="text-sm font-medium">{seq || "no coded pitches"}</div>
      {pa.contactQuality && (
        <div className="mt-1 text-xs text-muted-foreground">
          {pa.contactQuality === "hard" || pa.contactQuality === "barrel" ? "🔴" : "🟢"} {pa.contactQuality}
          {pa.sprayZone ? ` · ${pa.sprayZone}` : ""}
        </div>
      )}
    </div>
  );
}

const ZONES: { id: string; cx: number; cy: number }[] = [
  { id: "P", cx: 50, cy: 65 },
  { id: "C", cx: 50, cy: 90 },
  { id: "1B", cx: 75, cy: 65 },
  { id: "2B", cx: 60, cy: 50 },
  { id: "SS", cx: 40, cy: 50 },
  { id: "3B", cx: 25, cy: 65 },
  { id: "LF", cx: 18, cy: 25 },
  { id: "CF", cx: 50, cy: 15 },
  { id: "RF", cx: 82, cy: 25 },
];

function SprayChartView({ entries }: { entries: PitchEntryRow[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No tracked contact yet.</p>;
  }
  return (
    <div>
      <svg viewBox="0 0 100 100" className="h-72 w-full rounded-xl bg-secondary">
        <path d="M 50 90 L 10 30 A 50 50 0 0 1 90 30 Z" fill="hsl(var(--muted))" opacity="0.3" />
        {ZONES.map((z) => (
          <text key={z.id} x={z.cx} y={z.cy + 1} textAnchor="middle" className="fill-muted-foreground text-[3px]">
            {z.id}
          </text>
        ))}
        {entries.map((e) => {
          const z = ZONES.find((zz) => zz.id === e.spray_zone);
          if (!z) return null;
          const offset = (Math.random() - 0.5) * 6;
          const color =
            e.contact_quality === "barrel" ? "#dc2626"
            : e.contact_quality === "hard" ? "#ef4444"
            : "#10b981";
          return (
            <circle key={e.id} cx={z.cx + offset} cy={z.cy + offset} r={2} fill={color} opacity={0.85} />
          );
        })}
      </svg>
      <div className="mt-3 flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Weak</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Hard</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-700" /> Barrel</span>
      </div>
    </div>
  );
}
