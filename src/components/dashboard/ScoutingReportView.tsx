import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TAG_CATEGORIES } from "@/lib/scoutTags";
import { GamePlanEditor } from "./GamePlanEditor";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

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

interface Obs {
  id: string;
  player_id: string;
  inning: number;
  is_team_level: boolean;
  jersey_number: string | null;
  tags: string[] | null;
  key_play: string | null;
  steal_it: string | null;
  pitcher_id: string | null;
  applies_to_team: string | null;
  created_at: string;
}

interface Pitcher {
  id: string;
  jersey_number: string;
  name: string | null;
  notes: string | null;
}

const TAG_TO_CATEGORY = new Map<string, string>();
for (const c of TAG_CATEGORIES) {
  for (const t of c.tags) TAG_TO_CATEGORY.set(t, c.label);
}

function TeamChip({ team }: { team: string | null }) {
  const label = team ?? "Unspecified";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-medium",
        team ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground italic",
      )}
    >
      {label}
    </span>
  );
}

function TagChip({ tag }: { tag: string }) {
  return (
    <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px]">
      {tag}
    </span>
  );
}

export function ScoutingReportView({ gameId }: { gameId: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameRow | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [obs, setObs] = useState<Obs[]>([]);
  const [pitchers, setPitchers] = useState<Pitcher[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const [{ data: g }, { data: o }, { data: p }] = await Promise.all([
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
          .select("id, jersey_number, name, notes")
          .eq("game_id", gameId),
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
        profMap = Object.fromEntries((profs ?? []).map((pr) => [pr.id, pr.full_name]));
      }

      if (cancel) return;
      setGame((g as GameRow | null) ?? null);
      setOpponentName(oppName);
      setObs((o as Obs[]) ?? []);
      setPitchers((p as Pitcher[]) ?? []);
      setProfiles(profMap);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [gameId]);

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

  const teamObs = obs.filter((o) => o.is_team_level);
  const playerObs = obs.filter((o) => !o.is_team_level && o.jersey_number);
  const stealObs = obs.filter((o) => !!o.steal_it);

  // Team observations grouped by inning
  const teamInnings = Array.from(new Set(teamObs.map((o) => o.inning))).sort((a, b) => a - b);

  // Player observations grouped by jersey, then team
  const playerByJersey = new Map<string, Obs[]>();
  for (const o of playerObs) {
    const j = o.jersey_number!;
    if (!playerByJersey.has(j)) playerByJersey.set(j, []);
    playerByJersey.get(j)!.push(o);
  }
  const sortedJerseys = Array.from(playerByJersey.keys()).sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });

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
          {game.home_team} <span className="text-muted-foreground">vs</span> {game.away_team}
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
            <span className="text-xs text-muted-foreground">· {game.tournament_name}</span>
          )}
        </div>
      </section>

      {/* Team Observations by Inning */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">Team observations by inning</h2>
        {teamInnings.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            No team-level notes yet.
          </p>
        ) : (
          <div className="space-y-3">
            {teamInnings.map((inn) => {
              const rows = teamObs.filter((o) => o.inning === inn);
              const tagsByCategory = new Map<string, Map<string, Set<string>>>(); // category -> tag -> teams
              for (const r of rows) {
                if (!r.tags) continue;
                const teamKey = r.applies_to_team ?? "Unspecified";
                for (const t of r.tags) {
                  const cat = TAG_TO_CATEGORY.get(t) ?? "Other";
                  if (!tagsByCategory.has(cat)) tagsByCategory.set(cat, new Map());
                  const inner = tagsByCategory.get(cat)!;
                  if (!inner.has(t)) inner.set(t, new Set());
                  inner.get(t)!.add(teamKey);
                }
              }
              const keyPlays = rows.filter((r) => r.key_play);
              return (
                <div key={inn} className="rounded-xl border bg-card p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Inning {inn}
                  </p>
                  {tagsByCategory.size > 0 && (
                    <div className="space-y-2">
                      {Array.from(tagsByCategory.entries()).map(([cat, tagMap]) => (
                        <div key={cat}>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {cat}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {Array.from(tagMap.entries()).map(([tag, teams]) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px]"
                              >
                                <span className="font-medium">{tag}</span>
                                {Array.from(teams).map((t) => (
                                  <TeamChip key={t} team={t === "Unspecified" ? null : t} />
                                ))}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {keyPlays.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {keyPlays.map((k) => (
                        <li
                          key={k.id}
                          className="rounded-lg border border-dashed bg-muted/20 p-2 text-xs"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">
                              {profiles[k.player_id] ?? "Unknown"}
                            </span>
                            <TeamChip team={k.applies_to_team} />
                          </div>
                          <p className="mt-0.5 italic">"{k.key_play}"</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Player-Level Intel */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">Player-level intel</h2>
        {sortedJerseys.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            No player-level notes yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {sortedJerseys.map((j) => {
              const rows = playerByJersey.get(j)!;
              const byTeam = new Map<string, Obs[]>();
              for (const r of rows) {
                const k = r.applies_to_team ?? "Unspecified";
                if (!byTeam.has(k)) byTeam.set(k, []);
                byTeam.get(k)!.push(r);
              }
              return (
                <li key={j} className="rounded-xl border bg-card p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm font-semibold">
                      #{j}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {Array.from(byTeam.entries()).map(([team, rs]) => {
                      const tagSet = new Set<string>();
                      for (const r of rs) for (const t of r.tags ?? []) tagSet.add(t);
                      const notes = rs.filter((r) => r.key_play);
                      const innings = Array.from(new Set(rs.map((r) => r.inning))).sort(
                        (a, b) => a - b,
                      );
                      return (
                        <div
                          key={team}
                          className="rounded-lg border border-border/60 bg-background/40 p-2"
                        >
                          <div className="mb-1 flex items-center gap-1.5">
                            <TeamChip team={team === "Unspecified" ? null : team} />
                            <span className="text-[10px] text-muted-foreground">
                              Inning{innings.length > 1 ? "s" : ""} {innings.join(", ")}
                            </span>
                          </div>
                          {tagSet.size > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {Array.from(tagSet).map((t) => (
                                <TagChip key={t} tag={t} />
                              ))}
                            </div>
                          )}
                          {notes.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                              {notes.map((n) => (
                                <li key={n.id} className="text-xs italic text-muted-foreground">
                                  "{n.key_play}"
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Pitcher Intel */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">Pitcher intel</h2>
        {pitchers.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            No pitchers tracked.
          </p>
        ) : (
          <ul className="space-y-2">
            {pitchers.map((p) => {
              const pObs = obs.filter((o) => o.pitcher_id === p.id);
              const tagSet = new Set<string>();
              for (const r of pObs) for (const t of r.tags ?? []) tagSet.add(t);
              const notes = pObs.filter((r) => r.key_play);
              const innings = Array.from(new Set(pObs.map((r) => r.inning))).sort(
                (a, b) => a - b,
              );
              return (
                <li key={p.id} className="rounded-xl border bg-card p-3">
                  <p className="font-semibold">
                    #{p.jersey_number}
                    {p.name && <span className="text-muted-foreground"> — {p.name}</span>}
                  </p>
                  {p.notes && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.notes}</p>
                  )}
                  {innings.length > 0 && (
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Inning{innings.length > 1 ? "s" : ""} {innings.join(", ")}
                    </p>
                  )}
                  {tagSet.size > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {Array.from(tagSet).map((t) => (
                        <TagChip key={t} tag={t} />
                      ))}
                    </div>
                  )}
                  {notes.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {notes.map((n) => (
                        <li key={n.id} className="text-xs italic text-muted-foreground">
                          "{n.key_play}"
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Steal It Wall */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">🔥 Steal It wall</h2>
        {stealObs.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            No Steal It notes.
          </p>
        ) : (
          <ul className="space-y-2">
            {stealObs.map((s) => (
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
        )}
      </section>

      {/* Coach Game Plan */}
      {user && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Coach game plan</h2>
          <GamePlanEditor gameId={gameId} coachId={user.id} />
        </section>
      )}
    </div>
  );
}
