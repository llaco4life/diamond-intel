import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { GameRow } from "@/hooks/useActiveGame";
import { CoachIntelSummary } from "./CoachIntelSummary";
import { resolveScoutSides, splitByTeamSide, type RawObs, type ScoutKind } from "@/lib/dashboardIntel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronDown } from "lucide-react";

const SCOUT_TYPE_KEY = (gameId: string) => `scoutType:${gameId}`;
type ScoutTypeOverride = ScoutKind | "auto";

function loadScoutTypeOverride(gameId: string): ScoutTypeOverride {
  if (typeof window === "undefined") return "auto";
  try {
    const v = window.localStorage.getItem(SCOUT_TYPE_KEY(gameId));
    if (v === "upcoming_opponent" || v === "neutral") return v;
  } catch { /* ignore */ }
  return "auto";
}
function saveScoutTypeOverride(gameId: string, v: ScoutTypeOverride) {
  if (typeof window === "undefined") return;
  try {
    if (v === "auto") window.localStorage.removeItem(SCOUT_TYPE_KEY(gameId));
    else window.localStorage.setItem(SCOUT_TYPE_KEY(gameId), v);
  } catch { /* ignore */ }
}

interface Pitcher {
  id: string;
  jersey_number: string;
  name: string | null;
  notes: string | null;
  team_side: string | null;
}

const POSITION_NOISE = new Set([
  "batter", "runner", "pitcher", "catcher",
  "p", "c", "1b", "2b", "3b", "ss", "lf", "cf", "rf", "if", "of", "dh",
  "first base", "second base", "third base", "shortstop",
  "left field", "center field", "right field",
  "first baseman", "second baseman", "third baseman",
  "1 baseman", "2 baseman", "3 baseman",
  "1 basemen", "2 basemen", "3 basemen",
  "na", "n/a", "none", "",
]);

function isNoise(tag: string): boolean {
  return POSITION_NOISE.has(tag.trim().toLowerCase());
}

function CollapsibleSection({
  title,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="rounded-xl border bg-card" open={defaultOpen}>
      <summary className="flex cursor-pointer items-center justify-between gap-2 p-3 text-sm font-medium">
        <span>
          {title}
          {typeof count === "number" && (
            <span className="ml-2 text-xs text-muted-foreground">({count})</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t p-3">{children}</div>
    </details>
  );
}

export function GameSummaryView({ gameId }: { gameId: string }) {
  const { user, role, org } = useAuth();
  const isCoach = role === "head_coach" || role === "assistant_coach";
  const [game, setGame] = useState<GameRow | null>(null);
  const [obs, setObs] = useState<RawObs[]>([]);
  const [pitchers, setPitchers] = useState<Pitcher[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [scoutOverride, setScoutOverride] = useState<ScoutTypeOverride>(() =>
    loadScoutTypeOverride(gameId),
  );

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const [{ data: g }, { data: p }] = await Promise.all([
        supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
        supabase.from("pitchers").select("id, jersey_number, name, notes, team_side").eq("game_id", gameId),
      ]);
      let obsQuery = supabase
        .from("scout_observations")
        .select(
          "id, player_id, inning, is_team_level, jersey_number, tags, key_play, steal_it, pitcher_id, applies_to_team, created_at",
        )
        .eq("game_id", gameId)
        .order("inning", { ascending: true });
      if (!isCoach && user) {
        obsQuery = obsQuery.eq("player_id", user.id);
      }
      const { data: o } = await obsQuery;

      let profMap: Record<string, string> = {};
      if (o && o.length > 0) {
        const ids = Array.from(new Set(o.map((x) => x.player_id)));
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);
        profMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p.full_name]));
      }

      if (!cancel) {
        setGame((g as GameRow | null) ?? null);
        setPitchers((p as Pitcher[]) ?? []);
        setObs((o as RawObs[]) ?? []);
        setProfiles(profMap);
        setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [gameId, isCoach, user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-8">
        <div className="h-32 animate-pulse rounded-xl bg-muted/50" />
      </div>
    );
  }
  if (!game) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-8 text-center">
        <p>Game not found.</p>
        <Link to="/" search={{ restricted: undefined }} className="mt-4 inline-block text-primary underline">
          Go home
        </Link>
      </div>
    );
  }

  const jobObs = obs.filter((o) => o.applies_to_team?.startsWith("job:"));
  const teamObs = obs.filter((o) => !o.applies_to_team?.startsWith("job:"));
  const innings = Array.from(new Set(teamObs.map((o) => o.inning))).sort((a, b) => a - b);

  const tagCountsByTeam = (rows: RawObs[]) => {
    const map = new Map<string, Map<string, number>>();
    for (const r of rows) {
      if (!r.tags) continue;
      const teamKey = r.applies_to_team ?? "Unspecified";
      for (const t of r.tags) {
        if (isNoise(t)) continue;
        if (!map.has(t)) map.set(t, new Map());
        const inner = map.get(t)!;
        inner.set(teamKey, (inner.get(teamKey) ?? 0) + 1);
      }
    }
    return Array.from(map.entries()).sort(
      (a, b) =>
        Array.from(b[1].values()).reduce((s, n) => s + n, 0) -
        Array.from(a[1].values()).reduce((s, n) => s + n, 0),
    );
  };

  const allKeyPlays = teamObs.filter((o) => o.key_play && o.key_play.trim().length > 0);
  const steals = obs.filter((o) => o.steal_it);
  const playerInning = new Map<string, number>();
  for (const o of obs) {
    const cur = playerInning.get(o.player_id) ?? 0;
    if (o.inning > cur) playerInning.set(o.player_id, o.inning);
  }

  const jobGroups = new Map<string, RawObs[]>();
  for (const o of jobObs) {
    const key = o.applies_to_team!.slice(4);
    if (!jobGroups.has(key)) jobGroups.set(key, []);
    jobGroups.get(key)!.push(o);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-6 space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {game.status === "ended" ? "Final" : "In progress"} · {new Date(game.game_date).toLocaleDateString()}
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          {game.home_team} <span className="text-muted-foreground">vs</span> {game.away_team}
        </h1>
        <p className="text-3xl font-bold tabular-nums mt-2">
          {game.home_score} — {game.away_score}
        </p>
        {game.tournament_name && (
          <p className="text-sm text-muted-foreground">{game.tournament_name}</p>
        )}
      </div>

      {!isCoach && (
        <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Showing only your observations.
        </p>
      )}

      {/* COACH INTEL — tabbed by scout type */}
      {(() => {
        const sides = resolveScoutSides(
          game.home_team,
          game.away_team,
          org?.name ?? null,
          scoutOverride === "auto" ? null : scoutOverride,
        );
        const split = splitByTeamSide(teamObs, sides);
        const primaryObs = split.kind === "upcoming_opponent" ? split.opponent : split.teamA;
        const secondaryObs = split.kind === "upcoming_opponent" ? split.ours : split.teamB;
        const primaryLabel = split.kind === "upcoming_opponent" ? "Opponent" : sides.kind === "neutral" ? sides.teamA : "";
        const secondaryLabel = split.kind === "upcoming_opponent" ? "Our Team" : sides.kind === "neutral" ? sides.teamB : "";
        const primarySub = split.kind === "neutral" ? "Home" : null;
        const secondarySub = split.kind === "neutral" ? "Away" : null;
        const setOverride = (v: ScoutTypeOverride) => {
          setScoutOverride(v);
          saveScoutTypeOverride(gameId, v);
        };
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="uppercase tracking-wider">Scout type:</span>
              <select
                value={scoutOverride}
                onChange={(e) => setOverride(e.target.value as ScoutTypeOverride)}
                className="rounded border bg-background px-2 py-0.5 text-xs"
              >
                <option value="auto">
                  Auto ({sides.kind === "upcoming_opponent" ? "Upcoming Opponent" : "Neutral Scout"})
                </option>
                <option value="upcoming_opponent">Upcoming Opponent</option>
                <option value="neutral">Neutral Scout</option>
              </select>
            </div>
            <Tabs defaultValue="primary">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="primary" className="flex flex-col items-center leading-tight py-1.5">
                  <span className="font-semibold">{primaryLabel}</span>
                  {primarySub && <span className="text-[10px] uppercase tracking-wider opacity-70">{primarySub}</span>}
                </TabsTrigger>
                <TabsTrigger value="secondary" className="flex flex-col items-center leading-tight py-1.5">
                  <span className="font-semibold">{secondaryLabel}</span>
                  {secondarySub && <span className="text-[10px] uppercase tracking-wider opacity-70">{secondarySub}</span>}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="primary" className="mt-4">
                <CoachIntelSummary obs={primaryObs} mode="scout" />
              </TabsContent>
              <TabsContent value="secondary" className="mt-4">
                <CoachIntelSummary
                  obs={secondaryObs}
                  mode={split.kind === "upcoming_opponent" ? "ours" : "scout"}
                />
              </TabsContent>
            </Tabs>
          </div>
        );
      })()}

      {/* Pitchers */}
      {pitchers.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">⚾ Pitchers</h2>
          {(() => {
            const groups: { label: string; list: Pitcher[] }[] = [
              { label: game.away_team, list: pitchers.filter((p) => p.team_side === "away") },
              { label: game.home_team, list: pitchers.filter((p) => p.team_side === "home") },
              { label: "Unassigned", list: pitchers.filter((p) => p.team_side == null) },
            ].filter((g) => g.list.length > 0);
            return (
              <div className="space-y-3">
                {groups.map((g) => (
                  <div key={g.label}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {g.label}
                    </p>
                    <ul className="space-y-2">
                      {g.list.map((p) => {
                        const pObs = obs.filter((o) => o.pitcher_id === p.id);
                        const counts = new Map<string, { c: number; last: number }>();
                        for (const o of pObs) {
                          for (const t of o.tags ?? []) {
                            if (isNoise(t)) continue;
                            const cur = counts.get(t) ?? { c: 0, last: o.inning };
                            cur.c += 1;
                            if (o.inning > cur.last) cur.last = o.inning;
                            counts.set(t, cur);
                          }
                        }
                        const sorted = Array.from(counts.entries()).sort((a, b) => b[1].c - a[1].c);
                        const firstSeen = pObs.length > 0
                          ? pObs.reduce((min, o) => (o.inning < min ? o.inning : min), pObs[0].inning)
                          : null;
                        const pitcherNotes = pObs
                          .filter((o) => o.key_play && o.key_play.trim().length > 0)
                          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
                        return (
                          <li key={p.id} className="rounded-xl border bg-card p-3 text-sm">
                            <p className="font-semibold">
                              #{p.jersey_number}
                              {p.name && <span className="text-muted-foreground"> — {p.name}</span>}
                            </p>
                            {firstSeen !== null && (
                              <p className="text-[11px] text-muted-foreground">
                                First seen Inning {firstSeen}
                              </p>
                            )}
                            {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                            {sorted.length > 0 && (
                              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                                {sorted.map(([tag, v]) => (
                                  <li key={tag} className="text-muted-foreground">
                                    <span className="font-medium text-foreground">{tag}</span> ×{v.c}
                                    <span className="ml-1 opacity-70">(last I{v.last})</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {pitcherNotes.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Scout Notes ({pitcherNotes.length})
                                </p>
                                {pitcherNotes.map((n) => (
                                  <div key={n.id} className="rounded-md border bg-background/60 px-2 py-1 text-xs">
                                    <p className="whitespace-pre-wrap">{n.key_play}</p>
                                    <p className="mt-0.5 text-[10px] text-muted-foreground">Inning {n.inning}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>
      )}

      {/* Steal It Wall */}
      {steals.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">🔥 Steal It wall</h2>
          <ul className="space-y-2">
            {steals.map((s) => (
              <li key={s.id} className="rounded-xl border-2 border-pink/60 bg-pink p-3 text-sm">
                <span className="text-xs text-pink-foreground/70">Inning {s.inning} · </span>
                {s.steal_it}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* RAW DATA — collapsed by default */}
      <div className="space-y-2 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Raw data
        </p>

        {isCoach && playerInning.size > 0 && (
          <CollapsibleSection title="Player progress" count={playerInning.size}>
            <ul className="space-y-1 text-sm">
              {Array.from(playerInning.entries()).map(([pid, inn]) => (
                <li key={pid} className="flex justify-between">
                  <span>{profiles[pid] ?? "Unknown"}</span>
                  <span className="font-medium">Inning {inn}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {innings.length > 0 && (
          <CollapsibleSection title="Observations by inning" count={innings.length}>
            <div className="space-y-3">
              {innings.map((i) => {
                const rows = teamObs.filter((o) => o.inning === i);
                const counts = tagCountsByTeam(rows);
                const players = rows.filter((r) => !r.is_team_level);
                return (
                  <div key={i} className="rounded-lg border bg-background p-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Inning {i}
                    </p>
                    {counts.length > 0 && (
                      <ul className="mb-2 space-y-1">
                        {counts.map(([tag, teamMap]) => (
                          <li key={tag} className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="font-medium">{tag}</span>
                            {Array.from(teamMap.entries()).map(([team, c]) => (
                              <span
                                key={team}
                                className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] text-primary"
                              >
                                ×{c} vs {team}
                              </span>
                            ))}
                          </li>
                        ))}
                      </ul>
                    )}
                    {players.length > 0 && (
                      <ul className="space-y-1 text-sm">
                        {players.map((pp) => {
                          const cleanedTags = (pp.tags ?? []).filter((t) => !isNoise(t));
                          const positionTags = (pp.tags ?? []).filter((t) => isNoise(t) && t.trim().length > 0);
                          return (
                            <li key={pp.id}>
                              <span className="mr-1.5 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">
                                #{pp.jersey_number}
                              </span>
                              {positionTags.map((pt) => (
                                <span key={pt} className="mr-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  {pt}
                                </span>
                              ))}
                              {cleanedTags.join(", ")}
                              {pp.key_play && <span className="italic"> — "{pp.key_play}"</span>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        )}

        {jobGroups.size > 0 && (
          <CollapsibleSection title="Assignment notes" count={jobGroups.size}>
            <div className="space-y-3">
              {Array.from(jobGroups.entries()).map(([assignment, rows]) => {
                const counts = new Map<string, number>();
                for (const r of rows) {
                  for (const t of r.tags ?? []) {
                    if (isNoise(t)) continue;
                    counts.set(t, (counts.get(t) ?? 0) + 1);
                  }
                }
                const sortedCounts = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
                const notes = rows.filter((r) => r.key_play).sort((a, b) => a.inning - b.inning);
                return (
                  <div key={assignment} className="rounded-lg border bg-background p-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {assignment}
                    </p>
                    {sortedCounts.length > 0 && (
                      <ul className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        {sortedCounts.map(([tag, c]) => (
                          <li key={tag} className="text-muted-foreground">
                            <span className="font-medium text-foreground">{tag}</span> ×{c}
                          </li>
                        ))}
                      </ul>
                    )}
                    {notes.length > 0 && (
                      <ul className="space-y-1 text-sm">
                        {notes.map((n) => (
                          <li key={n.id}>
                            <span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                              I{n.inning}
                            </span>
                            <span className="italic">"{n.key_play}"</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        )}

        {allKeyPlays.length > 0 && (
          <CollapsibleSection title="All raw notes" count={allKeyPlays.length}>
            <ul className="space-y-2">
              {allKeyPlays.map((k) => (
                <li key={k.id} className="rounded-lg border bg-background p-2 text-sm">
                  <span className="text-xs text-muted-foreground">Inning {k.inning} · </span>
                  {k.key_play}
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}
      </div>

      <Link to="/" search={{ restricted: undefined }}>
        <Button variant="outline" className="w-full">
          Back to Home
        </Button>
      </Link>
    </div>
  );
}
