import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { GameRow } from "@/hooks/useActiveGame";
import { pitchLabel, type PitchCounts } from "@/lib/pitchTypes";

interface Obs {
  id: string;
  inning: number;
  is_team_level: boolean;
  jersey_number: string | null;
  tags: string[] | null;
  key_play: string | null;
  steal_it: string | null;
  applies_to_team: string | null;
  created_at: string;
}

interface AtBat {
  id: string;
  inning: number;
  confidence_level: number;
  execution: number;
  mental_focus: number;
  pitches_seen: string | null;
  notes: string | null;
  created_at: string;
  batter_number: string | null;
  batter_team: "my_team" | "opponent" | null;
  pitch_counts: PitchCounts | null;
}

export function LearningSummaryView({ sessionId }: { sessionId: string }) {
  const { user } = useAuth();
  const [game, setGame] = useState<GameRow | null>(null);
  const [obs, setObs] = useState<Obs[]>([]);
  const [atBats, setAtBats] = useState<AtBat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const [{ data: g }, { data: o }, { data: a }] = await Promise.all([
        supabase.from("games").select("*").eq("id", sessionId).maybeSingle(),
        supabase
          .from("scout_observations")
          .select(
            "id, inning, is_team_level, jersey_number, tags, key_play, steal_it, applies_to_team, created_at",
          )
          .eq("game_id", sessionId)
          .eq("player_id", user.id)
          .order("inning", { ascending: true }),
        supabase
          .from("at_bats")
          .select(
            "id, inning, confidence_level, execution, mental_focus, pitches_seen, notes, created_at, batter_number, batter_team, pitch_counts",
          )
          .eq("game_id", sessionId)
          .eq("player_id", user.id)
          .order("inning", { ascending: true }),
      ]);
      if (!cancel) {
        setGame((g as GameRow | null) ?? null);
        setObs((o as Obs[]) ?? []);
        setAtBats((a as unknown as AtBat[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [sessionId, user]);

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
        <p>Session not found.</p>
        <Link to="/learning" className="mt-4 inline-block text-primary underline">
          Back to Learning
        </Link>
      </div>
    );
  }

  const innings = Array.from(new Set(obs.map((o) => o.inning))).sort((a, b) => a - b);
  const steals = obs.filter((o) => o.steal_it);
  const notes = obs.filter((o) => !o.steal_it);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-6 space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {game.status === "ended" ? "Session ended" : "In progress"} ·{" "}
          {new Date(game.game_date).toLocaleDateString()}
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          {game.home_team} <span className="text-muted-foreground">vs</span> {game.away_team}
        </h1>
        {game.tournament_name && (
          <p className="text-sm text-muted-foreground">{game.tournament_name}</p>
        )}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Observations by inning</h2>
        {innings.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            No observations.
          </p>
        ) : (
          <div className="space-y-3">
            {innings.map((i) => {
              const rows = notes.filter((o) => o.inning === i);
              if (rows.length === 0) return null;
              return (
                <div key={i} className="rounded-xl border bg-card p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Inning {i}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {rows.map((r) => (
                      <li key={r.id}>
                        {r.applies_to_team && (
                          <span className="mr-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {r.applies_to_team}
                          </span>
                        )}
                        {r.tags && r.tags.length > 0 && (
                          <span className="font-medium">{r.tags.join(", ")}</span>
                        )}
                        {r.key_play && <span className="italic"> — "{r.key_play}"</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {steals.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">🔥 Steal It</h2>
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

      <section>
        <h2 className="mb-2 text-sm font-semibold">At-bat log ({atBats.length})</h2>
        {atBats.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            No at-bats logged.
          </p>
        ) : (
          <ul className="space-y-2">
            {atBats.map((a) => {
              const teamName =
                a.batter_team === "my_team"
                  ? game.home_team
                  : a.batter_team === "opponent"
                    ? game.away_team
                    : null;
              const counts = a.pitch_counts ?? {};
              const countEntries = Object.entries(counts).filter(
                ([, v]) => typeof v === "number" && v > 0,
              );
              return (
                <li key={a.id} className="rounded-xl border bg-card p-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    Inning {a.inning}
                    {a.batter_number && ` · #${a.batter_number}`}
                    {teamName && ` · ${teamName}`}
                  </p>
                  <p className="mt-0.5">
                    Conf <span className="font-semibold">{a.confidence_level}</span> · Exec{" "}
                    <span className="font-semibold">{a.execution}</span> · Focus{" "}
                    <span className="font-semibold">{a.mental_focus}</span>
                  </p>
                  {countEntries.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {countEntries.map(([slug, v]) => (
                        <span
                          key={slug}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                        >
                          {pitchLabel(slug)} ×{v}
                        </span>
                      ))}
                    </div>
                  ) : (
                    a.pitches_seen && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.pitches_seen}</p>
                    )
                  )}
                  {a.notes && <p className="mt-0.5 italic">"{a.notes}"</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Link to="/learning">
        <Button variant="outline" className="w-full">
          Back to Learning
        </Button>
      </Link>
    </div>
  );
}
