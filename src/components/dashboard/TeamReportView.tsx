// Aggregated multi-game report for a single team. Reuses CoachIntelSummary
// + the dashboardIntel engine, but feeds it observations filtered to this
// team only (across every scout game where the team appeared as home OR away).

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CoachIntelSummary } from "@/components/scout/CoachIntelSummary";
import {
  computePitcherCall,
  type RawObs,
  type PinnedItem,
} from "@/lib/dashboardIntel";
import { isOurTeamTag } from "@/lib/coachLanguage";
import type { TeamEntry } from "@/lib/teamIndex";
import { cn } from "@/lib/utils";

interface GameMeta {
  id: string;
  game_date: string;
  tournament_name: string | null;
  home_team: string;
  away_team: string;
}

interface Pitcher {
  id: string;
  jersey_number: string;
  name: string | null;
  notes: string | null;
  is_active: boolean;
  game_id: string;
  team_side: string | null;
}

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export function TeamReportView({
  team,
  onOpenGame,
}: {
  team: TeamEntry;
  onOpenGame: (gameId: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<GameMeta[]>([]);
  const [obs, setObs] = useState<RawObs[]>([]);
  const [pitchers, setPitchers] = useState<Pitcher[]>([]);
  const [pins, setPins] = useState<PinnedItem[]>([]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      if (team.gameIds.length === 0) {
        setGames([]);
        setObs([]);
        setPitchers([]);
        setPins([]);
        setLoading(false);
        return;
      }
      const [{ data: g }, { data: o }, { data: p }, { data: pinData }] =
        await Promise.all([
          supabase
            .from("games")
            .select("id, game_date, tournament_name, home_team, away_team")
            .in("id", team.gameIds)
            .order("game_date", { ascending: false }),
          supabase
            .from("scout_observations")
            .select(
              "id, player_id, inning, is_team_level, jersey_number, tags, key_play, steal_it, pitcher_id, applies_to_team, created_at, game_id",
            )
            .in("game_id", team.gameIds)
            .order("inning", { ascending: true })
            .order("created_at", { ascending: true }),
          supabase
            .from("pitchers")
            .select("id, jersey_number, name, notes, is_active, game_id, team_side")
            .in("game_id", team.gameIds),
          supabase
            .from("pinned_must_know")
            .select("id, pin_key, label, detail, observation_id, game_id")
            .in("game_id", team.gameIds),
        ]);

      if (cancel) return;
      setGames((g as GameMeta[] | null) ?? []);
      setObs((o as RawObs[] | null) ?? []);
      setPitchers((p as Pitcher[] | null) ?? []);
      setPins((pinData as PinnedItem[] | null) ?? []);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [team.key, team.gameIds.join("|")]);

  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted/50" />;
  }

  // Filter observations to this team only.
  // - Job-tab obs are excluded (they're scout-role notes, not team intel).
  // - Match by applies_to_team normalized to team name.
  // - When applies_to_team is null, infer side from tag heuristics:
  //   "ours" tags belong to whichever team is the *user's* team, not this one,
  //   so treat untagged-side notes conservatively — include only when the game
  //   itself is this team vs an unknown side (single-team game).
  const gameById = new Map(games.map((g) => [g.id, g]));
  const teamObs = obs.filter((o) => {
    if ((o.applies_to_team ?? "").startsWith("job:")) return false;
    const t = norm(o.applies_to_team);
    if (t === team.key) return true;
    if (t) return false; // explicitly tagged for the OTHER team
    // Untagged: include only if this team appears in the game and the note
    // is not flagged as "our team" content.
    const g = gameById.get(o.game_id as unknown as string);
    if (!g) return false;
    const isInGame =
      norm(g.home_team) === team.key || norm(g.away_team) === team.key;
    if (!isInGame) return false;
    const tags = o.tags ?? [];
    return !tags.some((tag) => isOurTeamTag(tag));
  });

  // Pitchers belonging to this team across all games.
  const teamPitchers = pitchers.filter((p) => {
    const g = gameById.get(p.game_id);
    if (!g) return false;
    if (p.team_side) {
      // team_side is typically "home" | "away"
      const side = p.team_side.toLowerCase();
      if (side === "home") return norm(g.home_team) === team.key;
      if (side === "away") return norm(g.away_team) === team.key;
    }
    // Fallback: include when team is in the game (best-effort).
    return norm(g.home_team) === team.key || norm(g.away_team) === team.key;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="rounded-2xl border bg-card p-4 shadow-card">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Team Report
        </p>
        <h1 className="mt-1 text-xl font-bold leading-tight">{team.name}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {team.sessionCount} session{team.sessionCount === 1 ? "" : "s"}
          {team.lastDate &&
            ` · last ${new Date(team.lastDate).toLocaleDateString()}`}
        </p>
      </section>

      {/* Aggregated coach intel for this team only */}
      <CoachIntelSummary obs={teamObs} pins={pins} mode="scout" />

      {/* Pitcher Breakdown — this team's pitchers across all sessions */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">⚾ Pitcher Breakdown</h2>
        {teamPitchers.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            No pitchers tracked for this team.
          </p>
        ) : (
          <ul className="space-y-2">
            {teamPitchers.map((p) => {
              const call = computePitcherCall(p.id, obs);
              const game = gameById.get(p.game_id);
              return (
                <li key={p.id} className="rounded-xl border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        #{p.jersey_number}
                        {p.name && (
                          <span className="ml-1 text-muted-foreground">
                            {p.name}
                          </span>
                        )}
                      </p>
                      {game && (
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(game.game_date).toLocaleDateString()} · {" "}
                          {game.home_team} vs {game.away_team}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm">{call.call}</p>
                  {call.topReads.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {call.topReads.map((r) => (
                        <span
                          key={r.tag}
                          className="rounded-full border bg-background px-2 py-0.5 text-[11px]"
                        >
                          {r.tag}
                          {r.count > 1 && (
                            <span className="ml-1 text-muted-foreground">
                              ×{r.count}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Sessions list — drill into a single game's full report */}
      {games.length > 0 && (
        <details className="rounded-xl border bg-card" open={games.length <= 3}>
          <summary className="cursor-pointer p-3 text-sm font-medium">
            Sessions
            <span className="ml-2 text-xs text-muted-foreground">
              ({games.length})
            </span>
          </summary>
          <ul className="space-y-1.5 border-t p-3">
            {games.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => onOpenGame(g.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm",
                    "transition-colors hover:bg-muted",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">
                      {g.home_team} vs {g.away_team}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {new Date(g.game_date).toLocaleDateString()}
                      {g.tournament_name && ` · ${g.tournament_name}`}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
