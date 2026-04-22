import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GameRow } from "@/hooks/useActiveGame";
import { DeleteGameButton } from "@/components/DeleteGameButton";

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

interface ActiveGameRowProps {
  game: GameRow;
  onJoin: (g: GameRow) => void;
  onDelete: (g: GameRow) => void;
  deleting: boolean;
}

function ActiveGameRow({ game, onJoin, onDelete, deleting }: ActiveGameRowProps) {
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [trackingCount, setTrackingCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [profile, obs, abs] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", game.created_by).maybeSingle(),
        supabase.from("scout_observations").select("player_id").eq("game_id", game.id),
        supabase.from("at_bats").select("player_id").eq("game_id", game.id),
      ]);
      if (cancelled) return;
      setCreatorName(profile.data?.full_name ?? null);
      const set = new Set<string>();
      (obs.data ?? []).forEach((r) => r.player_id && set.add(r.player_id));
      (abs.data ?? []).forEach((r) => r.player_id && set.add(r.player_id));
      setTrackingCount(set.size);
    })();
    return () => {
      cancelled = true;
    };
  }, [game.id, game.created_by]);

  return (
    <li className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">
            {game.home_team} <span className="text-muted-foreground">vs</span> {game.away_team}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Started {relativeTime(game.created_at)} by {creatorName ?? "a teammate"}
          </p>
          {game.tournament_name && (
            <p className="mt-0.5 text-xs text-muted-foreground">{game.tournament_name}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge>Active</Badge>
          <Badge variant="secondary" className="capitalize">
            {game.game_type}
          </Badge>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {trackingCount === null
            ? "Tracking…"
            : `${trackingCount} ${trackingCount === 1 ? "person" : "people"} tracking`}
        </p>
        <div className="flex items-center gap-2">
          <DeleteGameButton
            game={game}
            busy={deleting}
            onConfirm={() => onDelete(game)}
            iconOnly
          />
          <Button size="sm" onClick={() => onJoin(game)}>
            Join Game
          </Button>
        </div>
      </div>
    </li>
  );
}

export function GameLobby({
  orgId,
  activeGames,
  onStart,
  onJoin,
}: {
  orgId: string;
  activeGames: GameRow[];
  onStart: () => void;
  onJoin: (g: GameRow) => void;
}) {
  const [recent, setRecent] = useState<GameRow[]>([]);
  const [activeLocal, setActiveLocal] = useState<GameRow[]>(activeGames);
  const [loading, setLoading] = useState(true);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setActiveLocal(activeGames);
  }, [activeGames]);

  const handleDelete = async (game: GameRow) => {
    setDeletingId(game.id);
    const { error } = await supabase.from("games").delete().eq("id", game.id);
    setDeletingId(null);
    if (error) {
      toast.error("Could not delete game.");
      return;
    }
    setActiveLocal((prev) => prev.filter((g) => g.id !== game.id));
    setRecent((prev) => prev.filter((g) => g.id !== game.id));
    toast.success("Game deleted.");
  };

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
        toast.error("Could not resume game.");
        return;
      }
      toast.success("Game resumed.");
    } finally {
      setResumingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 pt-8 pb-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Scout</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Multiple games can run at the same time. Join one your team is already tracking, or start a
        new one.
      </p>

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <Button onClick={onStart} size="lg" className="w-full">
          Start a New Game
        </Button>
      </section>

      {activeLocal.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Active games ({activeLocal.length})
          </h2>
          <ul className="space-y-3">
            {activeLocal.map((g) => (
              <ActiveGameRow
                key={g.id}
                game={g}
                onJoin={onJoin}
                onDelete={handleDelete}
                deleting={deletingId === g.id}
              />
            ))}
          </ul>
        </section>
      )}

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
                  <DeleteGameButton
                    game={g}
                    busy={deletingId === g.id}
                    onConfirm={() => handleDelete(g)}
                    iconOnly
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
