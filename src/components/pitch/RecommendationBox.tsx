import { recommend } from "@/lib/pitchIntel/recommend";
import type { PitchEntryRow, PitchTypeRow } from "@/lib/pitchIntel/types";
import { Sparkles, ThumbsDown, Target, History } from "lucide-react";

interface Props {
  pitchTypes: PitchTypeRow[];
  entries: PitchEntryRow[];
  batterKey: string;
  batterTeam: string;
  pitcherId: string;
  balls: number;
  strikes: number;
  historicalEntries?: PitchEntryRow[];
  gameDateById?: Map<string, string>;
  historicalGameCount?: number;
}

export function RecommendationBox(props: Props) {
  const out = recommend(props.pitchTypes, props.entries, {
    batterKey: props.batterKey,
    batterTeam: props.batterTeam,
    pitcherId: props.pitcherId,
    balls: props.balls,
    strikes: props.strikes,
    historicalEntries: props.historicalEntries,
    gameDateById: props.gameDateById,
    historicalGameCount: props.historicalGameCount,
  });

  const s = out.sources;
  const sourceLine = s && (s.todayCount + s.historyCount) > 0
    ? `${s.todayCount + s.historyCount} pitches · ${s.todayCount} today${
        s.historyCount > 0
          ? ` · ${s.historyCount} from ${s.gameCount} prior game${s.gameCount === 1 ? "" : "s"}${
              s.oldestDays !== null ? ` (last ${s.oldestDays}d)` : ""
            }`
          : ""
      }`
    : null;

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Recommendation
        </div>
        <span className="text-[10px] font-medium uppercase text-muted-foreground">
          {out.situationLabel} · {out.confidence}
        </span>
      </div>

      {sourceLine && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <History className="h-3 w-3" />
          <span>{sourceLine}</span>
        </div>
      )}

      {out.emptyMessage ? (
        <p className="text-sm text-muted-foreground">{out.emptyMessage}</p>
      ) : (
        <>
          {out.historyOnly && (
            <p className="text-[11px] italic text-muted-foreground">
              Based on prior matchups vs {props.batterTeam}.
            </p>
          )}
          {out.bestChase && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                <Target className="h-3 w-3" />
                Best chase pitch
              </div>
              <div className="text-sm font-semibold">
                {out.bestChase.label}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  · {out.bestChase.score}% swing-strike rate
                </span>
              </div>
            </div>
          )}
          {out.recommended.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase text-muted-foreground">Throw</div>
              <ul className="space-y-1">
                {out.recommended.map((r) => (
                  <li key={r.pitchTypeId} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{r.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      +{r.score} · {r.samples}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {out.avoid.length > 0 && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2">
              <div className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase text-red-700 dark:text-red-400">
                <ThumbsDown className="h-3 w-3" />
                Avoid these pitches
              </div>
              <ul className="space-y-1">
                {out.avoid.map((r) => (
                  <li key={r.pitchTypeId} className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-red-700 dark:text-red-300 line-through decoration-red-500/60">
                      {r.label}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {r.score} · {r.samples}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
