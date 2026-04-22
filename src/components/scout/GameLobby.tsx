import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GameRow } from "@/hooks/useActiveGame";

export function GameLobby({
  orgId,
  onStart,
  onResumed,
}: {
  orgId: string;
  onStart: () => void;
  onResumed?: () => void;
}) {
  const [recent, setRecent] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumingId, setResumingId] = useState<string | null>(null);

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

  const handleResume = async (game: GameRow) => {
    setResumingId(game.id);
    try {
      const { error } = await supabase
        .from("games")
        .update({ status: "active" })
        .eq("id", game.id)
        .select("id, status")
        .single();
      if (error) {
        // 23505 = another active scout game already exists
        if (error.code === "23505" && game.game_type === "scout") {
          toast.error("Another active game already exists. End it before resuming this one.");
        } else {
          toast.error("Could not resume game.");
        }
        return;
      }
      toast.success("Game resumed.");
      onResumed?.();
    } finally {
      setResumingId(null);
    }
  };

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
                className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {g.home_team} <span className="text-muted-foreground">vs</span> {g.away_team}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(g.game_date).toLocaleDateString()} · {g.home_score}–{g.away_score}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    to="/scout/summary/$gameId"
                    params={{ gameId: g.id }}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View summary
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleResume(g)}
                    disabled={resumingId === g.id}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    {resumingId === g.id ? "Resuming…" : "Resume"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
