import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GameRow } from "@/hooks/useActiveGame";
import { DeleteGameButton } from "@/components/DeleteGameButton";

interface DevItem {
  id: string;
  source_note: string;
}

const PHASE_LABEL: Record<string, string> = {
  prep: "Prep",
  live: "Live",
  reflect: "Awaiting reflection",
  develop: "Set goals",
};

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
  const [goals, setGoals] = useState<DevItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (game: GameRow) => {
    setDeletingId(game.id);
    const { error } = await supabase.from("games").delete().eq("id", game.id);
    setDeletingId(null);
    if (error) {
      toast.error("Could not delete session.");
      return;
    }
    setActive((prev) => prev.filter((g) => g.id !== game.id));
    setRecent((prev) => prev.filter((g) => g.id !== game.id));
    toast.success("Session deleted.");
  };

  const handleResume = async (game: GameRow) => {
    setResumingId(game.id);
    const { data, error } = await supabase
      .from("games")
      .update({ status: "active" })
      .eq("id", game.id)
      .select("*")
      .single();
    setResumingId(null);
    if (error || !data) {
      toast.error("Could not resume session.");
      return;
    }
    toast.success("Session resumed.");
    onResume(data as GameRow);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: a }, { data: r }, { data: g }] = await Promise.all([
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
        supabase
          .from("development_items")
          .select("id, source_note")
          .eq("player_id", userId)
          .eq("status", "working_on")
          .order("updated_at", { ascending: false })
          .limit(3),
      ]);
      if (cancelled) return;
      setActive((a as GameRow[] | null) ?? []);
      setRecent((r as GameRow[] | null) ?? []);
      setGoals((g as DevItem[] | null) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const awaitingReflection = active.filter((g) => g.learning_phase === "reflect");
  const otherActive = active.filter((g) => g.learning_phase !== "reflect");

  return (
    <div className="mx-auto max-w-xl px-4 pt-8 pb-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Learning</h1>
          <p className="text-xs text-muted-foreground">
            Prep smart · reflect honest · develop weekly.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <Button onClick={onStart} size="lg" className="w-full">
          Start Pre-Game Prep
        </Button>
      </section>

      {awaitingReflection.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Awaiting reflection
          </h2>
          <ul className="space-y-3">
            {awaitingReflection.map((g) => (
              <li key={g.id} className="rounded-2xl border-2 border-warning/40 bg-warning/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">
                      {g.home_team} <span className="text-muted-foreground">vs</span> {g.away_team}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(g.game_date).toLocaleDateString()} · game finished
                    </p>
                  </div>
                  <Badge variant="outline">Reflect</Badge>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <DeleteGameButton
                    game={g}
                    busy={deletingId === g.id}
                    onConfirm={() => handleDelete(g)}
                    label="Delete session"
                  />
                  <Button size="sm" onClick={() => onResume(g)}>
                    Reflect now
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {otherActive.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your active sessions
          </h2>
          <ul className="space-y-3">
            {otherActive.map((g) => (
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
                    {g.learning_focuses && g.learning_focuses.length > 0 && (
                      <p className="mt-1 truncate text-xs">
                        <span className="text-muted-foreground">Focus: </span>
                        <span className="font-medium">{g.learning_focuses.join(" · ")}</span>
                      </p>
                    )}
                  </div>
                  <Badge>{PHASE_LABEL[g.learning_phase ?? "live"] ?? "Active"}</Badge>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <DeleteGameButton
                    game={g}
                    busy={deletingId === g.id}
                    onConfirm={() => handleDelete(g)}
                    label="Delete session"
                  />
                  <Button size="sm" onClick={() => onResume(g)}>
                    Resume
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 rounded-2xl border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Active development goals
            </h2>
          </div>
          <Link to="/development" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active goals yet. They'll appear here after your first reflection.
          </p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {goals.map((g) => (
              <li key={g.id} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="line-clamp-2">{g.source_note}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

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
                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    to="/learning/summary/$sessionId"
                    params={{ sessionId: g.id }}
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
                    label="Delete session"
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
