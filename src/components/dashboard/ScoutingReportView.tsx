import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GamePlanEditor } from "./GamePlanEditor";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  computeMustKnow,
  computeAttackPlan,
  computePitcherCall,
  computeRoleIntel,
  type RawObs,
  type PinnedItem,
  type MustKnowItem,
  type AttackBucket,
} from "@/lib/dashboardIntel";
import { useAiCoachCall } from "@/hooks/useAiCoachCall";
import type { PitcherCoachCallInput } from "@/server/pitcherCoachCall.functions";
import { Pin, PinOff, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface GameRow {
  id: string;
  game_date: string;
  tournament_name: string | null;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  status: "active" | "ended";
  opponent_id: string | null;
}

interface Pitcher {
  id: string;
  jersey_number: string;
  name: string | null;
  notes: string | null;
  is_active: boolean;
}

function TeamChip({ team }: { team: string | null }) {
  const label = team ?? "Unspecified";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-medium",
        team
          ? "bg-primary-soft text-primary"
          : "bg-muted text-muted-foreground italic",
      )}
    >
      {label}
    </span>
  );
}

function ConfidenceChip({ level }: { level: "High" | "Medium" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        level === "High"
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      {level} confidence
    </span>
  );
}

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

export function ScoutingReportView({ gameId }: { gameId: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameRow | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [obs, setObs] = useState<RawObs[]>([]);
  const [pitchers, setPitchers] = useState<Pitcher[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [pins, setPins] = useState<PinnedItem[]>([]);
  const [isCoach, setIsCoach] = useState(false);
  const [showAllSteal, setShowAllSteal] = useState(false);

  const loadPins = useCallback(async () => {
    const { data } = await supabase
      .from("pinned_must_know")
      .select("id, pin_key, label, detail, observation_id")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });
    setPins((data as PinnedItem[]) ?? []);
  }, [gameId]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const [{ data: g }, { data: o }, { data: p }, { data: pinData }] =
        await Promise.all([
          supabase
            .from("games")
            .select(
              "id, game_date, tournament_name, home_team, away_team, home_score, away_score, status, opponent_id",
            )
            .eq("id", gameId)
            .maybeSingle(),
          supabase
            .from("scout_observations")
            .select(
              "id, player_id, inning, is_team_level, jersey_number, tags, key_play, steal_it, pitcher_id, applies_to_team, created_at",
            )
            .eq("game_id", gameId)
            .order("inning", { ascending: true })
            .order("created_at", { ascending: true }),
          supabase
            .from("pitchers")
            .select("id, jersey_number, name, notes, is_active")
            .eq("game_id", gameId),
          supabase
            .from("pinned_must_know")
            .select("id, pin_key, label, detail, observation_id")
            .eq("game_id", gameId)
            .order("created_at", { ascending: true }),
        ]);

      let oppName: string | null = null;
      if (g?.opponent_id) {
        const { data: opp } = await supabase
          .from("opponents")
          .select("team_name")
          .eq("id", g.opponent_id)
          .maybeSingle();
        oppName = opp?.team_name ?? null;
      }

      let profMap: Record<string, string> = {};
      if (o && o.length > 0) {
        const ids = Array.from(new Set(o.map((x) => x.player_id)));
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);
        profMap = Object.fromEntries(
          (profs ?? []).map((pr) => [pr.id, pr.full_name]),
        );
      }

      let coach = false;
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        coach = (roles ?? []).some(
          (r) => r.role === "head_coach" || r.role === "assistant_coach",
        );
      }

      if (cancel) return;
      setGame((g as GameRow | null) ?? null);
      setOpponentName(oppName);
      setObs((o as RawObs[]) ?? []);
      setPitchers((p as Pitcher[]) ?? []);
      setProfiles(profMap);
      setPins((pinData as PinnedItem[]) ?? []);
      setIsCoach(coach);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [gameId, user]);

  const togglePin = useCallback(
    async (item: MustKnowItem) => {
      if (!user) return;
      if (item.pinned && item.pinId) {
        const { error } = await supabase
          .from("pinned_must_know")
          .delete()
          .eq("id", item.pinId);
        if (error) {
          toast.error("Could not unpin");
          return;
        }
        toast.success("Unpinned");
      } else {
        const label = item.jersey
          ? `#${item.jersey} — ${item.tag}`
          : item.tag;
        const detail = item.sampleNote ?? null;
        const { error } = await supabase.from("pinned_must_know").insert({
          game_id: gameId,
          pin_key: item.key,
          label,
          detail,
          pinned_by: user.id,
          observation_id: item.observationIds[0] ?? null,
        });
        if (error) {
          toast.error("Could not pin");
          return;
        }
        toast.success("Pinned to Top 5");
      }
      await loadPins();
    },
    [user, gameId, loadPins],
  );

  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted/50" />;
  }
  if (!game) {
    return (
      <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
        Report not found.
      </p>
    );
  }

  // Split obs into team intel vs role-intel (My Job)
  const roleObs = obs.filter((o) =>
    (o.applies_to_team ?? "").startsWith("job:"),
  );
  const teamObs = obs.filter(
    (o) => !(o.applies_to_team ?? "").startsWith("job:"),
  );

  const mustKnow = computeMustKnow(teamObs, pins, 5);
  const attackPlan = computeAttackPlan(teamObs);
  const roleIntel = computeRoleIntel(roleObs);
  const stealObs = obs.filter((o) => !!o.steal_it);
  const visibleSteal = showAllSteal ? stealObs : stealObs.slice(0, 3);

  // Existing inning view (collapsed, raw)
  const teamInnings = Array.from(
    new Set(teamObs.filter((o) => o.is_team_level).map((o) => o.inning)),
  ).sort((a, b) => a - b);

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="rounded-2xl border bg-card p-4 shadow-card">
        {opponentName && (
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            vs {opponentName}
          </p>
        )}
        <h1 className="mt-1 text-xl font-bold leading-tight">
          {game.home_team}{" "}
          <span className="text-muted-foreground">vs</span> {game.away_team}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold tabular-nums">
            {game.home_score}–{game.away_score}
          </span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              game.status === "ended"
                ? "bg-muted text-muted-foreground"
                : "bg-primary-soft text-primary",
            )}
          >
            {game.status === "ended" ? "Final" : "Active"}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(game.game_date).toLocaleDateString()}
          </span>
          {game.tournament_name && (
            <span className="text-xs text-muted-foreground">
              · {game.tournament_name}
            </span>
          )}
        </div>
      </section>

      {/* Coach Intel: Must Know + Attack Plan + Alerts + Confirmed Reads */}
      <CoachIntelSummary obs={teamObs} pins={pins} />

      {/* Pin controls (coaches only) — promote any Must Know to a permanent pin */}
      {isCoach && mustKnow.length > 0 && (
        <section>
          <details className="rounded-xl border bg-card">
            <summary className="cursor-pointer p-3 text-xs font-medium text-muted-foreground">
              Pin items to Top 5 ({mustKnow.filter((m) => m.pinned).length} pinned)
            </summary>
            <ul className="space-y-1 border-t p-3">
              {mustKnow.map((m) => (
                <li key={m.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    {m.jersey ? `#${m.jersey} ` : ""}
                    <span className="font-medium">{m.tag}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePin(m)}
                    className={cn(
                      "shrink-0 rounded-lg border p-1.5 transition-colors",
                      m.pinned
                        ? "border-amber-500/70 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "border-border bg-background hover:bg-muted",
                    )}
                    aria-label={m.pinned ? "Unpin" : "Pin"}
                  >
                    {m.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      {/* Pitcher Breakdown */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">⚾ Pitcher Breakdown</h2>
        {pitchers.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            No pitchers tracked.
          </p>
        ) : (
          <ul className="space-y-2">
            {pitchers.map((p) => (
              <PitcherCard
                key={p.id}
                pitcher={p}
                obs={obs}
                opponentName={opponentName}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Role Intel */}
      {roleIntel.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">🧠 Role Intel</h2>
          <ul className="space-y-2">
            {roleIntel.map((r) => (
              <li key={r.assignment} className="rounded-xl border bg-card p-3">
                <p className="text-sm font-semibold">{r.assignment}</p>
                {r.tagCounts.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {r.tagCounts.map((t) => (
                      <span
                        key={t.tag}
                        className="rounded-full border bg-background px-2 py-0.5 text-[11px]"
                      >
                        {t.tag}
                        {t.count > 1 && (
                          <span className="ml-1 text-muted-foreground">
                            ×{t.count}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                {r.notes.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {r.notes.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-lg border border-dashed bg-muted/20 p-2 text-xs italic"
                      >
                        <span className="not-italic text-muted-foreground">
                          Inn {n.inning}:
                        </span>{" "}
                        "{n.text}"
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Steal It Wall */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">🔥 Steal It Wall</h2>
        {stealObs.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            No Steal It notes.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {visibleSteal.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border-2 border-pink/60 bg-pink p-3 text-sm"
                >
                  <div className="flex items-center gap-1.5 text-xs text-pink-foreground/70">
                    <span>Inning {s.inning}</span>
                    <span>·</span>
                    <span>{profiles[s.player_id] ?? "Unknown"}</span>
                  </div>
                  <p className="mt-0.5">{s.steal_it}</p>
                </li>
              ))}
            </ul>
            {stealObs.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllSteal((v) => !v)}
                className="mt-2 text-xs font-medium text-primary hover:underline"
              >
                {showAllSteal
                  ? "Show top 3 only"
                  : `View all ${stealObs.length}`}
              </button>
            )}
          </>
        )}
      </section>

      {/* Coach Game Plan */}
      {user && isCoach && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Coach Game Plan</h2>
          <GamePlanEditor gameId={gameId} coachId={user.id} />
        </section>
      )}

      {/* Raw observations (collapsed) */}
      {teamInnings.length > 0 && (
        <details className="rounded-xl border bg-card p-3">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            All raw observations ({teamObs.length})
          </summary>
          <div className="mt-3 space-y-3">
            {teamInnings.map((inn) => {
              const rows = teamObs.filter(
                (o) => o.is_team_level && o.inning === inn,
              );
              return (
                <div key={inn} className="rounded-lg border bg-background p-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Inning {inn}
                  </p>
                  <ul className="space-y-1">
                    {rows.map((r) => (
                      <li key={r.id} className="text-xs">
                        <span className="text-muted-foreground">
                          {profiles[r.player_id] ?? "Unknown"}:
                        </span>{" "}
                        {r.tags?.join(", ")}
                        {r.key_play && (
                          <span className="italic"> — "{r.key_play}"</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}

interface PitcherCardProps {
  pitcher: Pitcher;
  obs: RawObs[];
  opponentName: string | null;
}

function PitcherCard({ pitcher, obs, opponentName }: PitcherCardProps) {
  const ruleCall = useMemo(
    () => computePitcherCall(pitcher.id, obs),
    [pitcher.id, obs],
  );

  const aiInput = useMemo<PitcherCoachCallInput | null>(() => {
    const tagCounts = ruleCall.topReads.length
      ? // include all (not just top 3) for the AI
        Object.entries(
          obs
            .filter((o) => o.pitcher_id === pitcher.id)
            .flatMap((o) => o.tags ?? [])
            .reduce<Record<string, number>>((acc, t) => {
              acc[t] = (acc[t] ?? 0) + 1;
              return acc;
            }, {}),
        ).map(([tag, count]) => ({ tag, count }))
      : [];

    const innings = obs
      .filter((o) => o.pitcher_id === pitcher.id)
      .map((o) => o.inning);
    const lastInning = innings.length ? Math.max(...innings) : 0;

    return {
      pitcher_number: pitcher.jersey_number,
      team: opponentName,
      tag_counts: tagCounts,
      last_inning_seen: lastInning,
      status: pitcher.is_active ? "active" : "finished",
    };
  }, [pitcher, obs, opponentName, ruleCall.topReads.length]);

  const ai = useAiCoachCall(pitcher.id, aiInput);

  const useAi =
    ai.result && ai.result.source === "ai" && ai.result.coach_call.length > 0;
  const displayedCall = useAi ? ai.result!.coach_call : ruleCall.call;
  const sourceLabel: "AI" | "Rule" = useAi ? "AI" : "Rule";
  const isLoading = ai.loading;

  return (
    <li className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="font-semibold">
          #{pitcher.jersey_number}
          {pitcher.name && (
            <span className="text-muted-foreground"> — {pitcher.name}</span>
          )}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            pitcher.is_active
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {pitcher.is_active ? "Active" : "Finished"}
        </span>
      </div>
      {ruleCall.topReads.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {ruleCall.topReads.map((r) => (
            <span
              key={r.tag}
              className="rounded-full border bg-background px-2 py-0.5 text-[11px]"
            >
              {r.tag}
              {r.count > 1 && (
                <span className="ml-1 text-muted-foreground">×{r.count}</span>
              )}
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 flex items-start gap-2 rounded-lg bg-primary-soft px-2 py-1.5 text-sm font-medium text-primary">
        <span className="flex-1">📣 Coach Call: {displayedCall}</span>
        <span
          className={cn(
            "shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
            isLoading
              ? "bg-muted text-muted-foreground"
              : sourceLabel === "AI"
                ? "bg-purple-600 text-white"
                : "bg-muted text-muted-foreground",
          )}
          title={
            isLoading
              ? "AI thinking…"
              : sourceLabel === "AI"
                ? "Generated by AI"
                : "Rule-based fallback"
          }
        >
          {isLoading ? (
            "…"
          ) : sourceLabel === "AI" ? (
            <>
              <Sparkles className="h-2.5 w-2.5" /> AI
            </>
          ) : (
            "Rule"
          )}
        </span>
      </p>
      {ai.result?.confidence && useAi && (
        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          AI confidence: {ai.result.confidence}
        </p>
      )}
      {pitcher.notes && (
        <p className="mt-1 text-xs text-muted-foreground">{pitcher.notes}</p>
      )}
      {(() => {
        const notes = obs
          .filter((o) => o.pitcher_id === pitcher.id && o.key_play && o.key_play.trim().length > 0)
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        if (notes.length === 0) return null;
        return (
          <div className="mt-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Scout Notes ({notes.length})
            </p>
            <ul className="space-y-1">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-md border bg-background/60 px-2 py-1 text-xs"
                >
                  <p className="whitespace-pre-wrap text-foreground">{n.key_play}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Inning {n.inning}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}
    </li>
  );
}
