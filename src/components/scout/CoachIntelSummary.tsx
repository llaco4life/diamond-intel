// Shared coach-ready intel block: Must Know, Attack Plan, Alerts,
// and Confirmed Reads. Used by both the scout Game Summary and the
// Coach Dashboard so they speak the same language.

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  computeMustKnow,
  computeAttackPlan,
  type RawObs,
  type PinnedItem,
  type AttackBucket,
} from "@/lib/dashboardIntel";
import {
  clusterByTheme,
  detectAlerts,
  scoreNotes,
  pickConfirmedReads,
  type Theme,
} from "@/lib/intelThemes";
import { AlertTriangle, ShieldCheck, Users } from "lucide-react";

const ATTACK_BUCKET_ORDER: AttackBucket[] = [
  "Offense",
  "Our Pitching Plan",
  "Defense",
  "Baserunning",
];

const ATTACK_BUCKET_ICON: Record<AttackBucket, string> = {
  Offense: "🏏",
  "Our Pitching Plan": "🎯",
  Defense: "🛡️",
  Baserunning: "🏃",
};

interface Props {
  obs: RawObs[];
  pins?: PinnedItem[];
  /** Notes belonging to a cluster appear once; total count is shown. */
  showConfirmedReads?: boolean;
}

interface MergedAction {
  bucket: AttackBucket;
  action: string;
  source: string;       // tag or theme label
  count: number;
  actionability: number;
}

export function CoachIntelSummary({
  obs,
  pins = [],
  showConfirmedReads = true,
}: Props) {
  const mustKnow = useMemo(() => computeMustKnow(obs, pins, 5), [obs, pins]);

  const themeClusters = useMemo(() => clusterByTheme(obs), [obs]);
  const alerts = useMemo(() => detectAlerts(obs), [obs]);
  const scored = useMemo(() => scoreNotes(obs), [obs]);
  const confirmedReads = useMemo(
    () => pickConfirmedReads(scored, themeClusters, 5),
    [scored, themeClusters],
  );

  const tagAttack = useMemo(() => computeAttackPlan(obs), [obs]);

  // Merge tag-derived + theme-derived attack actions, dedup by action text.
  const attackByBucket = useMemo(() => {
    const merged: Record<AttackBucket, MergedAction[]> = {
      Offense: [], Defense: [], "Our Pitching Plan": [], Baserunning: [],
    };
    const seen = new Set<string>();

    for (const bucket of ATTACK_BUCKET_ORDER) {
      for (const a of tagAttack[bucket]) {
        const k = `${bucket}::${a.action}`;
        if (seen.has(k)) continue;
        seen.add(k);
        merged[bucket].push({
          bucket, action: a.action, source: a.tag, count: a.count, actionability: 3,
        });
      }
    }
    for (const c of themeClusters) {
      const t: Theme = c.theme;
      const k = `${t.bucket}::${t.action}`;
      const existing = merged[t.bucket].find((m) => m.action === t.action);
      if (existing) {
        existing.count += c.notes.length;
        existing.actionability = Math.max(existing.actionability, t.actionability);
      } else {
        merged[t.bucket].push({
          bucket: t.bucket,
          action: t.action,
          source: t.label,
          count: c.notes.length,
          actionability: t.actionability,
        });
        seen.add(k);
      }
    }
    for (const b of ATTACK_BUCKET_ORDER) {
      merged[b].sort(
        (a, z) => z.actionability * 10 + z.count - (a.actionability * 10 + a.count),
      );
    }
    return merged;
  }, [tagAttack, themeClusters]);

  const allEmpty =
    mustKnow.length === 0 &&
    alerts.length === 0 &&
    confirmedReads.length === 0 &&
    ATTACK_BUCKET_ORDER.every((b) => attackByBucket[b].length === 0);

  if (allEmpty) {
    return (
      <section>
        <h2 className="mb-2 text-sm font-semibold">⚡ Coach Intel</h2>
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          No intel logged yet.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {/* Must Know */}
      {mustKnow.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">⚡ Must Know</h2>
          <ul className="space-y-2">
            {mustKnow.map((m) => (
              <li
                key={m.key}
                className={cn(
                  "rounded-xl border-2 bg-card p-3 shadow-card",
                  m.pinned
                    ? "border-amber-500/70 bg-amber-50/50 dark:bg-amber-950/20"
                    : "border-border",
                )}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  {m.jersey && (
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">
                      #{m.jersey}
                    </span>
                  )}
                  <span className="font-semibold">{m.tag}</span>
                  {m.appliesTo && (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary">
                      {m.appliesTo}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  {m.count > 0 && (
                    <span>
                      Seen {m.count}× · innings {m.innings.join(", ")}
                    </span>
                  )}
                  {m.observers.size > 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                      <ShieldCheck className="h-3 w-3" />
                      Confirmed by {m.observers.size} players
                    </span>
                  )}
                </div>
                {m.sampleNote && (
                  <p className="mt-1.5 text-xs italic text-muted-foreground">
                    "{m.sampleNote}"
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Attack Plan */}
      {ATTACK_BUCKET_ORDER.some((b) => attackByBucket[b].length > 0) && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">🎯 Attack Plan</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {ATTACK_BUCKET_ORDER.map((bucket) => {
              const actions = attackByBucket[bucket];
              if (actions.length === 0) return null;
              return (
                <div key={bucket} className="rounded-xl border bg-card p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {ATTACK_BUCKET_ICON[bucket]} {bucket}
                  </p>
                  <ul className="space-y-1.5">
                    {actions.slice(0, 5).map((a) => (
                      <li key={a.action} className="text-sm leading-snug">
                        <span className="font-medium">{a.action}</span>
                        <span className="ml-1 text-[11px] text-muted-foreground">
                          ({a.source}{a.count > 1 ? ` ×${a.count}` : ""})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Alerts
          </h2>
          <ul className="space-y-1.5">
            {alerts.slice(0, 8).map((a) => (
              <li
                key={a.observationId}
                className="rounded-xl border-l-4 border-amber-500 bg-amber-50/60 p-2.5 text-sm dark:bg-amber-950/20"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    {a.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Inning {a.inning}
                    {a.jersey ? ` · #${a.jersey}` : ""}
                  </span>
                </div>
                <p className="mt-1 text-foreground">"{a.text}"</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Confirmed Reads */}
      {showConfirmedReads && confirmedReads.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">📝 Confirmed Reads</h2>
          <ul className="space-y-1.5">
            {confirmedReads.map((r) => (
              <li
                key={r.obs.id}
                className="rounded-xl border bg-card p-2.5 text-sm"
              >
                <p className="text-foreground">"{r.obs.key_play}"</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  <span>Inning {r.obs.inning}</span>
                  {r.obs.jersey_number && <span>· #{r.obs.jersey_number}</span>}
                  {r.observerCount > 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                      <Users className="h-3 w-3" />
                      Confirmed by {r.observerCount} players
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
