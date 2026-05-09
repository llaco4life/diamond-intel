import { cn } from "@/lib/utils";
import { zoneLabel, ZONE_NUMBERS, type BatterHand } from "@/lib/pitchIntel/pitchZones";

interface Props {
  hand: BatterHand;
  value: number | null;
  onChange: (v: number | null) => void;
}

export function PitchLocationGrid({ hand, value, onChange }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-bold uppercase text-muted-foreground">Pitch location</div>
        {value != null && (
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => onChange(null)}
          >
            Clear
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {ZONE_NUMBERS.map((z) => {
          const selected = value === z;
          return (
            <button
              key={z}
              type="button"
              onClick={() => onChange(selected ? null : z)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-lg border text-center transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary hover:bg-secondary/70",
              )}
            >
              <span className="text-2xl font-black tabular-nums leading-none">{z}</span>
              <span
                className={cn(
                  "mt-1 text-[10px] leading-tight",
                  selected ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {zoneLabel(z, hand)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        Catcher's view · top = high, bottom = low · labels for {hand === "R" ? "RHH" : hand === "L" ? "LHH" : "switch hitter"}
      </div>
    </div>
  );
}
