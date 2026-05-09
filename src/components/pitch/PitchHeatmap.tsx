import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { zoneLabel, ZONE_NUMBERS, type BatterHand } from "@/lib/pitchIntel/pitchZones";
import type { PitchEntryRow } from "@/lib/pitchIntel/types";

interface Props {
  entries: PitchEntryRow[];
  hand?: BatterHand;
}

/**
 * 3×3 heatmap of pitch_location frequencies. Cell shading scales with count
 * relative to the max-count cell. Counts and percentages render inside.
 */
export function PitchHeatmap({ entries, hand = "R" }: Props) {
  const counts = useMemo(() => {
    const c: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    let total = 0;
    for (const e of entries) {
      if (e.pitch_location && c[e.pitch_location] != null) {
        c[e.pitch_location] += 1;
        total += 1;
      }
    }
    return { c, total };
  }, [entries]);

  const max = Math.max(...Object.values(counts.c));

  if (counts.total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No pitch locations recorded yet. Tap a zone (1–9) when logging pitches to build the heatmap.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{counts.total} located pitch{counts.total === 1 ? "" : "es"}</span>
        <span>Catcher's view · {hand === "R" ? "RHH" : hand === "L" ? "LHH" : "switch"}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {ZONE_NUMBERS.map((z) => {
          const n = counts.c[z];
          const pct = counts.total > 0 ? Math.round((n / counts.total) * 100) : 0;
          const intensity = max > 0 ? n / max : 0;
          return (
            <div
              key={z}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-lg border text-center",
                intensity === 0 ? "border-border bg-secondary/40" : "border-primary/40",
              )}
              style={
                intensity > 0
                  ? { backgroundColor: `color-mix(in oklab, hsl(var(--primary)) ${Math.round(intensity * 80)}%, transparent)` }
                  : undefined
              }
            >
              <span className="text-[10px] font-bold uppercase text-muted-foreground">#{z}</span>
              <span className="text-2xl font-black tabular-nums leading-none">{n}</span>
              <span className="mt-0.5 text-[10px] text-muted-foreground">{pct}%</span>
              <span className="mt-0.5 text-[9px] leading-tight text-muted-foreground">{zoneLabel(z, hand)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
