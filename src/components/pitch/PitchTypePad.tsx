import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { PitchTypeRow } from "@/lib/pitchIntel/types";

interface Props {
  pitchTypes: PitchTypeRow[];
  value: string | null;
  onChange: (id: string | null) => void;
}

export function PitchTypePad({ pitchTypes, value, onChange }: Props) {
  if (pitchTypes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground">
        No pitch types yet for this team.{" "}
        <Link to="/pitch/codes" className="font-semibold text-primary underline">
          Add them in Settings
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-bold uppercase text-muted-foreground">Pitch type</div>
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
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {pitchTypes.map((p) => {
          const selected = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(selected ? null : p.id)}
              className={cn(
                "rounded-lg border px-3 py-3 text-sm font-semibold transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary hover:bg-secondary/70",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
