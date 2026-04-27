import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { ProtectedShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchEntriesForBatter } from "@/hooks/usePitchEntries";
import { usePitchTypes } from "@/hooks/usePitchTypes";
import type { PitchEntryRow } from "@/lib/pitchIntel/types";

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
  const [team, jersey] = batterKey.split(":");
  const { types: pitchTypes } = usePitchTypes();
  const [entries, setEntries] = useState<PitchEntryRow[]>([]);
  const labelMap = new Map(pitchTypes.map((p) => [p.id, p.label]));

  useEffect(() => {
    void (async () => {
      const rows = await fetchEntriesForBatter(batterKey, team);
      setEntries(rows);
    })();
  }, [batterKey, team]);

  // Group into PAs
  const pas = groupPAs(entries);
  const currentPa = pas.find((p) => p.gameId === gameId && !p.complete);
  const previousPas = pas.filter((p) => p !== currentPa);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-6">
      <header className="mb-3 flex items-center justify-between">
        <Link
          to="/pitch/$gameId"
          params={{ gameId }}
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Logger
        </Link>
        <div className="text-xs text-muted-foreground">{team}</div>
      </header>

      <h1 className="mb-3 text-2xl font-bold">#{jersey} · {team}</h1>

      <Tabs defaultValue="current">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">Current</TabsTrigger>
          <TabsTrigger value="previous">Previous</TabsTrigger>
          <TabsTrigger value="spray">Spray</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-3">
          {currentPa ? (
            <PaCard pa={currentPa} labelMap={labelMap} />
          ) : (
            <p className="text-sm text-muted-foreground">No active at-bat right now.</p>
          )}
        </TabsContent>

        <TabsContent value="previous" className="mt-3 space-y-2">
          {previousPas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prior at-bats yet.</p>
          ) : (
            previousPas.map((pa) => <PaCard key={pa.id} pa={pa} labelMap={labelMap} />)
          )}
        </TabsContent>

        <TabsContent value="spray" className="mt-3">
          <SprayChartView entries={entries.filter((e) => e.spray_zone)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface PA {
  id: string;
  gameId: string;
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
  const map = new Map<string, PA>();
  for (const e of entries) {
    const key = `${e.game_id}#${e.at_bat_seq}`;
    let pa = map.get(key);
    if (!pa) {
      pa = {
        id: key,
        gameId: e.game_id,
        inning: e.inning,
        atBatSeq: e.at_bat_seq,
        pitches: [],
        complete: false,
        abResult: null,
        contactQuality: null,
        sprayZone: null,
        date: e.created_at,
      };
      map.set(key, pa);
    }
    pa.pitches.push(e);
    if (e.ab_result) {
      pa.complete = true;
      pa.abResult = e.ab_result;
      pa.contactQuality = e.contact_quality;
      pa.sprayZone = e.spray_zone;
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

function PaCard({ pa, labelMap }: { pa: PA; labelMap: Map<string, string> }) {
  const seq = pa.pitches
    .map((p) => p.pitch_type_id ? labelMap.get(p.pitch_type_id)?.split(" ")[0] : "?")
    .join(" → ");
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>Inning {pa.inning} · {new Date(pa.date).toLocaleDateString()}</span>
        <span className="font-mono">{pa.abResult ?? "in progress"}</span>
      </div>
      <div className="text-sm font-medium">{seq || "no coded pitches"}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {pa.pitches.map((p, i) => (
          <span key={p.id} className="mr-2">
            {i + 1}: {p.balls_before}-{p.strikes_before} {p.result}
          </span>
        ))}
      </div>
      {pa.contactQuality && (
        <div className="mt-1 text-xs">
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
            <circle
              key={e.id}
              cx={z.cx + offset}
              cy={z.cy + offset}
              r={2}
              fill={color}
              opacity={0.85}
            />
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
