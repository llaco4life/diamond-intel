import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  inning: number;
  isTop: boolean;
  outs: number;
  pitcherLabel?: string;
  pitchCount?: number;
  onChangeScore: (side: "home" | "away", delta: number) => void;
  onChangeOuts: (delta: number) => void;
}

export function ScoreboardBanner({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  inning,
  isTop,
  outs,
  pitcherLabel,
  pitchCount,
  onChangeScore,
  onChangeOuts,
}: Props) {
  const ord = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
  };

  return (
    <div className="mb-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>
          {isTop ? "Top" : "Bot"} {ord(inning)}
        </span>
        <button
          type="button"
          onClick={() => onChangeOuts(1)}
          className="rounded-full bg-secondary px-2 py-0.5 text-foreground hover:bg-secondary/70"
          aria-label="Add out"
        >
          {outs} {outs === 1 ? "out" : "outs"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ScoreCell
          label={awayTeam}
          score={awayScore}
          highlight={isTop}
          onMinus={() => onChangeScore("away", -1)}
          onPlus={() => onChangeScore("away", 1)}
        />
        <ScoreCell
          label={homeTeam}
          score={homeScore}
          highlight={!isTop}
          onMinus={() => onChangeScore("home", -1)}
          onPlus={() => onChangeScore("home", 1)}
        />
      </div>

      {pitcherLabel && (
        <div className="mt-2 border-t border-border/60 pt-2 text-xs text-muted-foreground">
          P: <span className="font-semibold text-foreground">{pitcherLabel}</span>
          {typeof pitchCount === "number" ? ` · ${pitchCount} pitches` : ""}
        </div>
      )}

      {outs > 0 && (
        <div className="mt-1 flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px] text-muted-foreground"
            onClick={() => onChangeOuts(-outs)}
          >
            Reset outs
          </Button>
        </div>
      )}
    </div>
  );
}

function ScoreCell({
  label,
  score,
  highlight,
  onMinus,
  onPlus,
}: {
  label: string;
  score: number;
  highlight: boolean;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl px-2 py-1.5 ${
        highlight ? "bg-primary/10 ring-1 ring-primary/30" : "bg-secondary"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-semibold uppercase">{label}</div>
        <div className="text-2xl font-black tabular-nums leading-none">{score}</div>
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onPlus}
          className="rounded-md bg-background p-0.5 text-foreground hover:bg-background/70"
          aria-label={`Add run ${label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onMinus}
          className="rounded-md bg-background p-0.5 text-foreground hover:bg-background/70"
          aria-label={`Subtract run ${label}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
