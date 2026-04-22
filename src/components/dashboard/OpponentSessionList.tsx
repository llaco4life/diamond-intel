import { useEffect, useState } from "react";
import { ChevronRight, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SessionRow {
  id: string;
  game_date: string;
  tournament_name: string | null;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  status: "active" | "ended";
  created_at: string;
  obs_count: number;
}

export function OpponentSessionList({
  opponentId,
  opponentName,
  onPickGame,
}: {
  opponentId: string | null;
  opponentName: string;
  onPickGame: (gameId: string) => void;
}) {
  const { org } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    if (!org?.id) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("games")
        .select(
          "id, game_date, tournament_name, home_team, away_team, home_score, away_score, status, created_at, opponent_id",
        )
        .eq("org_id", org.id)
        .eq("game_type", "scout");
      if (opponentId === null) {
        q = q.is("opponent_id", null);
      } else {
        q = q.eq("opponent_id", opponentId);
      }
      const { data: games } = await q;

      const ids = (games ?? []).map((g) => g.id);
      let countByGame = new Map<string, number>();
      if (ids.length > 0) {
        const { data: obs } = await supabase
          .from("scout_observations")
          .select("game_id")
          .in("game_id", ids);
        for (const row of obs ?? []) {
          countByGame.set(row.game_id, (countByGame.get(row.game_id) ?? 0) + 1);
        }
      }

      if (cancel) return;
      const rows: SessionRow[] = (games ?? [])
        .map((g) => ({
          id: g.id,
          game_date: g.game_date,
          tournament_name: g.tournament_name,
          home_team: g.home_team,
          away_team: g.away_team,
          home_score: g.home_score,
          away_score: g.away_score,
          status: g.status as "active" | "ended",
          created_at: g.created_at,
          obs_count: countByGame.get(g.id) ?? 0,
        }))
        .sort((a, b) => {
          if (a.game_date !== b.game_date) return b.game_date.localeCompare(a.game_date);
          return b.created_at.localeCompare(a.created_at);
        });

      setSessions(rows);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [org?.id, opponentId]);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold">{opponentName}</h2>
        <p className="text-xs text-muted-foreground">
          {loading ? "Loading sessions…" : `${sessions.length} scout session${sessions.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted/50" />
      ) : sessions.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          No sessions for this opponent yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const hasScore = s.status === "ended" || s.home_score > 0 || s.away_score > 0;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onPickGame(s.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border bg-card p-4 text-left shadow-card active:scale-[0.99] transition-transform"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold">
                        {new Date(s.game_date).toLocaleDateString()}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          s.status === "ended"
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary-soft text-primary",
                        )}
                      >
                        {s.status === "ended" ? "Final" : "Active"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm">
                      {s.home_team} <span className="text-muted-foreground">vs</span>{" "}
                      {s.away_team}
                      {hasScore && (
                        <span className="ml-1.5 font-semibold tabular-nums">
                          {s.home_score}–{s.away_score}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {s.tournament_name && `${s.tournament_name} · `}
                      {s.obs_count} observation{s.obs_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
