import { computeFatigue, computeHardContactStreak } from "@/lib/pitchIntel/fatigue";
import type { PitchEntryRow } from "@/lib/pitchIntel/types";
import { AlertTriangle } from "lucide-react";

export function PitcherFatigueBar({
  entries,
  pitcherId,
  pitcherLabel,
}: {
  entries: PitchEntryRow[];
  pitcherId: string;
  pitcherLabel: string;
}) {
  const total = entries.filter((e) => e.pitcher_id === pitcherId).length;
  const fatigue = computeFatigue(total);
  const streak = computeHardContactStreak(entries, pitcherId);

  const colorMap: Record<typeof fatigue.level, string> = {
    ok: "bg-secondary text-secondary-foreground",
    yellow: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40",
    red: "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/40",
    critical: "bg-red-600 text-white",
  };

  return (
    <div className="space-y-1.5">
      <div className={`rounded-lg px-3 py-2 text-sm font-medium ${colorMap[fatigue.level]}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">Pitcher: {pitcherLabel}</span>
          <span className="font-mono tabular-nums">{fatigue.message}</span>
        </div>
      </div>
      {streak.warn && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300">
          <AlertTriangle className="h-3.5 w-3.5" />
          {streak.message}
        </div>
      )}
    </div>
  );
}
