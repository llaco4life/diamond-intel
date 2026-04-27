import { Button } from "@/components/ui/button";
import type { PitchResult } from "@/lib/pitchIntel/types";

interface Props {
  onPick: (r: PitchResult) => void;
  disabled?: boolean;
}

const buttons: { result: PitchResult; label: string; tone: "neutral" | "good" | "warn" | "primary" }[] = [
  { result: "ball", label: "Ball", tone: "neutral" },
  { result: "called_strike", label: "Called K", tone: "good" },
  { result: "swinging_strike", label: "Swing K", tone: "good" },
  { result: "foul", label: "Foul", tone: "neutral" },
  { result: "in_play", label: "In Play", tone: "primary" },
  { result: "hbp", label: "HBP", tone: "warn" },
  { result: "foul_tip_caught", label: "Foul Tip K", tone: "good" },
  { result: "caught_foul", label: "Caught Foul", tone: "good" },
];

export function ResultPad({ onPick, disabled }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {buttons.map((b) => {
        const cls =
          b.tone === "primary"
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : b.tone === "good"
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : b.tone === "warn"
            ? "bg-amber-600 text-white hover:bg-amber-700"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80";
        return (
          <Button
            key={b.result}
            type="button"
            disabled={disabled}
            onClick={() => onPick(b.result)}
            className={`h-14 rounded-xl text-sm font-semibold ${cls}`}
          >
            {b.label}
          </Button>
        );
      })}
    </div>
  );
}
