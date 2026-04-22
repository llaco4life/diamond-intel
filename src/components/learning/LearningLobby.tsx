import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { GameRow } from "@/hooks/useActiveGame";

export function LearningLobby({
  userId,
  onStart,
  onResume,
}: {
  userId: string;
  onStart: () => void;
  onResume: (g: GameRow) => void;
}) {
  const [active, setActive] = useState<GameRow[]>([]);
  const [recent, setRecent] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: a }, { data: r }] = await Promise.all([
        supabase
          .from("games")
          .select("*")
          .eq("created_by", userId)
          .eq("game_type", "learning")
          .eq("status", "active")
          .order("created_at", { ascending: false }),
        supabase
          .from("games")
          .select("*")
          .eq("created_by", userId)
          .eq("game_type", "learning")
          .eq("status", "ended")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      if (cancelled) return;
      setActive((a as GameRow[] | null) ?? []);
      setRecent((r as GameRow[] | null) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="mx-auto max-w-xl px-4 pt-8 pb-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Learning</h1>
          <p className="text-xs text-muted-foreground">
            Your personal study sessions — become a student of the game.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <Button onClick={onStart} size="lg" className="w-full">
          Start a New Session
        </Button>
      </section>

      {active.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your active sessions
          </h2>
          <ul className="space-y-3">
            {active.map((g) => (
              <li key={g.id} className="rounded-2xl border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">
                      {g.home_team} <span className="text-muted-foreground">vs</span> {g.away_team}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {g.tournament_name ?? "Learning"} ·{" "}
                      {new Date(g.game_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge>Active</Badge>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" onClick={() => onResume(g)}>
                    Resume
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent sessions
        </h2>
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed sessions yet.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {g.home_team} <span className="text-muted-foreground">vs</span> {g.away_team}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(g.game_date).toLocaleDateString()} ·{" "}
                    {g.tournament_name ?? "Learning"}
                  </p>
                </div>
                <Link
                  to="/learning/summary/$sessionId"
                  params={{ sessionId: g.id }}
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
