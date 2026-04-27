import type { PitchEntryRow, PitchTypeRow } from "@/lib/pitchIntel/types";

interface Props {
  entries: PitchEntryRow[];
  batterKey: string;
  batterTeam: string;
  pitchTypes: PitchTypeRow[];
}

interface BuiltPA {
  inning: number;
  pitches: PitchEntryRow[];
  abResult: string | null;
  contactQuality: string | null;
  spray: string | null;
}

function buildLastPA(entries: PitchEntryRow[]): BuiltPA | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  // Find latest at_bat that is COMPLETE (has ab_result on its terminal pitch).
  const byAb = new Map<number, PitchEntryRow[]>();
  for (const e of sorted) {
    const arr = byAb.get(e.at_bat_seq) ?? [];
    arr.push(e);
    byAb.set(e.at_bat_seq, arr);
  }
  const completedSeqs = Array.from(byAb.entries())
    .filter(([, arr]) => arr.some((p) => p.ab_result))
    .map(([seq]) => seq)
    .sort((a, b) => b - a);
  if (completedSeqs.length === 0) return null;
  const pitches = byAb.get(completedSeqs[0])!;
  const last = pitches.find((p) => p.ab_result);
  return {
    inning: pitches[0].inning,
    pitches,
    abResult: last?.ab_result ?? null,
    contactQuality: last?.contact_quality ?? null,
    spray: last?.spray_zone ?? null,
  };
}

export function PreviousPABanner({ entries, batterKey, batterTeam, pitchTypes }: Props) {
  const filtered = entries.filter((e) => e.batter_key === batterKey && e.batter_team === batterTeam);
  const pa = buildLastPA(filtered);
  const labelMap = new Map(pitchTypes.map((t) => [t.id, t.label]));

  if (!pa) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        First PA — no prior at-bat for this batter.
      </div>
    );
  }

  const seq = pa.pitches
    .map((p) => (p.pitch_type_id ? labelMap.get(p.pitch_type_id)?.split(" ")[0] : "?"))
    .filter(Boolean)
    .join(" → ");

  const dot =
    pa.contactQuality === "hard" || pa.contactQuality === "barrel"
      ? "🔴"
      : pa.contactQuality === "weak"
      ? "🟢"
      : "·";

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
      <div className="mb-1 flex items-center justify-between text-muted-foreground">
        <span>Last PA · Inning {pa.inning}</span>
        <span className="font-mono">{pa.abResult ?? "—"}</span>
      </div>
      <div className="font-medium">{seq || "—"}</div>
      <div className="mt-0.5 text-muted-foreground">
        {dot} {pa.contactQuality ?? "no contact"}
        {pa.spray ? ` · to ${pa.spray}` : ""}
      </div>
    </div>
  );
}
