import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ContactQuality, SprayZone, AbResult } from "@/lib/pitchIntel/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { spray: SprayZone; contact: ContactQuality; abResult: AbResult }) => void;
}

const ZONES: { id: SprayZone; cx: number; cy: number; label: string }[] = [
  { id: "P", cx: 50, cy: 65, label: "P" },
  { id: "C", cx: 50, cy: 90, label: "C" },
  { id: "1B", cx: 75, cy: 65, label: "1B" },
  { id: "2B", cx: 60, cy: 50, label: "2B" },
  { id: "SS", cx: 40, cy: 50, label: "SS" },
  { id: "3B", cx: 25, cy: 65, label: "3B" },
  { id: "LF", cx: 18, cy: 25, label: "LF" },
  { id: "CF", cx: 50, cy: 15, label: "CF" },
  { id: "RF", cx: 82, cy: 25, label: "RF" },
];

const AB_RESULTS: AbResult[] = ["1B", "2B", "3B", "HR", "GO", "FO", "LO", "PO", "SF", "E"];

export function SprayChartModal({ open, onClose, onSubmit }: Props) {
  const [spray, setSpray] = useState<SprayZone | null>(null);
  const [contact, setContact] = useState<ContactQuality | null>(null);
  const [abResult, setAbResult] = useState<AbResult | null>(null);

  const reset = () => {
    setSpray(null);
    setContact(null);
    setAbResult(null);
  };

  const handleSubmit = () => {
    if (!spray || !contact || !abResult) return;
    onSubmit({ spray, contact, abResult });
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Where did the ball go?</DialogTitle>
        </DialogHeader>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            1. Spray zone
          </p>
          <svg viewBox="0 0 100 100" className="h-56 w-full rounded-xl bg-secondary">
            <path d="M 50 90 L 10 30 A 50 50 0 0 1 90 30 Z" fill="hsl(var(--muted))" opacity="0.3" />
            {ZONES.map((z) => (
              <g key={z.id} onClick={() => setSpray(z.id)} className="cursor-pointer">
                <circle
                  cx={z.cx}
                  cy={z.cy}
                  r={7}
                  className={spray === z.id ? "fill-primary" : "fill-card stroke-border"}
                  strokeWidth={1}
                />
                <text
                  x={z.cx}
                  y={z.cy + 1.5}
                  textAnchor="middle"
                  className={`text-[5px] font-bold ${spray === z.id ? "fill-primary-foreground" : "fill-foreground"}`}
                >
                  {z.label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            2. Contact quality
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(["weak", "hard", "barrel"] as ContactQuality[]).map((c) => (
              <Button
                key={c}
                type="button"
                variant={contact === c ? "default" : "outline"}
                onClick={() => setContact(c)}
                className="capitalize"
              >
                {c}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            3. At-bat result
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {AB_RESULTS.map((r) => (
              <Button
                key={r}
                type="button"
                size="sm"
                variant={abResult === r ? "default" : "outline"}
                onClick={() => setAbResult(r)}
              >
                {r}
              </Button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!spray || !contact || !abResult}
          className="mt-2 h-12"
        >
          Save pitch
        </Button>
      </DialogContent>
    </Dialog>
  );
}
