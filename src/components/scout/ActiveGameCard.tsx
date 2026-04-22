import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { GameRow } from "@/hooks/useActiveGame";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function ActiveGameCard({
  game,
  onJoin,
}: {
  game: GameRow;
  onJoin: () => void;
}) {
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [trackingCount, setTrackingCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tasks: Promise<unknown>[] = [];
      if (game.opponent_id) {
        tasks.push(
          supabase
            .from("opponents")
            .select("team_name")
            .eq("id", game.opponent_id)
            .maybeSingle()
            .then(({ data }) => {
              if (!cancelled) setOpponentName(data?.team_name ?? null);
            }),
        );
      }
      tasks.push(
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", game.created_by)
          .maybeSingle()
          .then(({ data }) => {
            if (!cancelled) setCreatorName(data?.full_name ?? null);
          }),
      );
      tasks.push(
        Promise.all([
          supabase.from("scout_observations").select("player_id").eq("game_id", game.id),
          supabase.from("at_bats").select("player_id").eq("game_id", game.id),
        ]).then(([obs, abs]) => {
          const set = new Set<string>();
          (obs.data ?? []).forEach((r) => r.player_id && set.add(r.player_id));
          (abs.data ?? []).forEach((r) => r.player_id && set.add(r.player_id));
          if (!cancelled) setTrackingCount(set.size);
        }),
      );
      await Promise.all(tasks);
    })();
    return () => {
      cancelled = true;
    };
  }, [game.id, game.opponent_id, game.created_by]);

  return (
    <div className="mx-auto max-w-xl px-4 pt-8 pb-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Active Game</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Your team is already tracking a game. Confirm and join the shared session.
      </p>

      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Matchup</p>
            <p className="text-lg font-semibold">
              {game.home_team} <span className="text-muted-foreground">vs</span> {game.away_team}
            </p>
            {opponentName && opponentName !== game.away_team && (
              <p className="text-sm text-muted-foreground">Opponent: {opponentName}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="default">Active</Badge>
            <Badge variant="secondary" className="capitalize">
              {game.game_type}
            </Badge>
          </div>
        </div>

        {game.tournament_name && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tournament</p>
            <p className="text-sm">{game.tournament_name}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Started</p>
            <p className="text-sm">{relativeTime(game.created_at)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tracking</p>
            <p className="text-sm">
              {trackingCount === null
                ? "—"
                : `${trackingCount} ${trackingCount === 1 ? "person" : "people"}`}
            </p>
          </div>
        </div>

        <Button onClick={onJoin} size="lg" className="w-full">
          Join Game
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Started by {creatorName ?? "a teammate"}
        </p>
      </section>
    </div>
  );
}
