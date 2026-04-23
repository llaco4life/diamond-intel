import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { GameRow } from "@/hooks/useActiveGame";

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

export function GameSummaryView({ gameId }: { gameId: string }) {
  const { user, role } = useAuth();
  const isCoach = role === "head_coach" || role === "assistant_coach";
  const [game, setGame] = useState<GameRow | null>(null);
  const [obs, setObs] = useState<Obs[]>([]);
  const [pitchers, setPitchers] = useState<Pitcher[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const [{ data: g }, { data: p }] = await Promise.all([
        supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
        supabase.from("pitchers").select("id, jersey_number, name, notes").eq("game_id", gameId),
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

      // profiles for coach inning panel
      let profMap: Record<string, string> = {};
      if (isCoach && o && o.length > 0) {
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
        setObs((o as Obs[]) ?? []);
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

  // Group team tags into counts per inning, split by applies_to_team
  const innings = Array.from(new Set(obs.map((o) => o.inning))).sort((a, b) => a - b);
  const tagCountsByTeam = (rows: Obs[]) => {
    // Map<tag, Map<team-or-unspecified, count>>
    const map = new Map<string, Map<string, number>>();
    for (const r of rows) {
      if (!r.tags) continue;
      const teamKey = r.applies_to_team ?? "Unspecified";
      for (const t of r.tags) {
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

  const keyPlays = obs.filter((o) => o.key_play);
  const steals = obs.filter((o) => o.steal_it);
  const playerInning = new Map<string, number>();
  for (const o of obs) {
    const cur = playerInning.get(o.player_id) ?? 0;
    if (o.inning > cur) playerInning.set(o.player_id, o.inning);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-6 space-y-5">
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

      {isCoach && playerInning.size > 0 && (
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold">Player progress</h2>
          <ul className="space-y-1 text-sm">
            {Array.from(playerInning.entries()).map(([pid, inn]) => (
              <li key={pid} className="flex justify-between">
                <span>{profiles[pid] ?? "Unknown"}</span>
                <span className="font-medium">Inning {inn}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Observations by inning</h2>
        {innings.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            No observations.
          </p>
        ) : (
          <div className="space-y-3">
            {innings.map((i) => {
              const rows = obs.filter((o) => o.inning === i);
              const counts = tagCountsByTeam(rows);
              const players = rows.filter((r) => !r.is_team_level);
              return (
                <div key={i} className="rounded-xl border bg-card p-3">
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
                      {players.map((p) => (
                        <li key={p.id}>
                          <span className="mr-1.5 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">
                            #{p.jersey_number}
                          </span>
                          {p.applies_to_team && (
                            <span className="mr-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                              {p.applies_to_team}
                            </span>
                          )}
                          {p.tags?.join(", ")}
                          {p.key_play && <span className="italic"> — "{p.key_play}"</span>}
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

      {keyPlays.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Key plays</h2>
          <ul className="space-y-2">
            {keyPlays.map((k) => (
              <li key={k.id} className="rounded-xl border bg-card p-3 text-sm">
                <span className="text-xs text-muted-foreground">Inning {k.inning} · </span>
                {k.key_play}
              </li>
            ))}
          </ul>
        </section>
      )}

      {pitchers.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Pitchers</h2>
          <ul className="space-y-2">
            {pitchers.map((p) => {
              const pObs = obs.filter((o) => o.pitcher_id === p.id);
              return (
                <li key={p.id} className="rounded-xl border bg-card p-3 text-sm">
                  <p className="font-semibold">
                    #{p.jersey_number}
                    {p.name && <span className="text-muted-foreground"> — {p.name}</span>}
                  </p>
                  {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                  {pObs.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pObs.map((o) => o.tags?.join(", ")).filter(Boolean).join(" · ")}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

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

      <Link to="/" search={{ restricted: undefined }}>
        <Button variant="outline" className="w-full">
          Back to Home
        </Button>
      </Link>
    </div>
  );
}
