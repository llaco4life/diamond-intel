import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { GameRow } from "@/hooks/useActiveGame";

export function GameLobby({
  orgId,
  onStart,
}: {
  orgId: string;
  onStart: () => void;
}) {
  const [recent, setRecent] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("games")
        .select("*")
        .eq("org_id", orgId)
        .eq("status", "ended")
        .order("created_at", { ascending: false })
        .limit(3);
      if (!cancelled) {
        setRecent((data as GameRow[] | null) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  return (
    <div className="mx-auto max-w-xl px-4 pt-8 pb-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Scout</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        When a coach or teammate starts a game, it will appear here automatically for everyone on
        the team.
      </p>

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <Button onClick={onStart} size="lg" className="w-full">
          Start a New Game
        </Button>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent games
        </h2>
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed games yet.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between rounded-xl border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {g.home_team} <span className="text-muted-foreground">vs</span> {g.away_team}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(g.game_date).toLocaleDateString()} · {g.home_score}–{g.away_score}
                  </p>
                </div>
                <Link
                  to="/scout/summary/$gameId"
                  params={{ gameId: g.id }}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View summary
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
