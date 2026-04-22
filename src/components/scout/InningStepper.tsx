import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InningStepper({
  inning,
  onChange,
}: {
  inning: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border bg-card p-2 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11"
        onClick={() => onChange(Math.max(1, inning - 1))}
        aria-label="Previous inning"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <div className="flex-1 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Inning</p>
        <p className="text-2xl font-bold tabular-nums">{inning}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11"
        onClick={() => onChange(inning + 1)}
        aria-label="Next inning"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
