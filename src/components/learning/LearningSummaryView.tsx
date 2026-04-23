import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { GameRow } from "@/hooks/useActiveGame";
import { pitchLabel, type PitchCounts } from "@/lib/pitchTypes";
import { PITCHING_TAG_SET } from "@/lib/scoutTags";

interface Obs {
  id: string;
  inning: number;
  is_team_level: boolean;
  jersey_number: string | null;
  tags: string[] | null;
  key_play: string | null;
  steal_it: string | null;
  applies_to_team: string | null;
  pitcher_id: string | null;
  created_at: string;
}

interface PitcherRow {
  id: string;
  jersey_number: string;
  team_side: "my_team" | "opponent" | null;
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

interface DiamondResponse {
  inning: number;
  prompt_key: string;
  prompt_text: string;
  response: string;
}

export function LearningSummaryView({ sessionId }: { sessionId: string }) {
  const { user } = useAuth();
  const [game, setGame] = useState<GameRow | null>(null);
  const [obs, setObs] = useState<Obs[]>([]);
  const [atBats, setAtBats] = useState<AtBat[]>([]);
  const [pitchers, setPitchers] = useState<PitcherRow[]>([]);
  const [diamond, setDiamond] = useState<DiamondResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const [{ data: g }, { data: o }, { data: a }, { data: p }, { data: d }] = await Promise.all([
        supabase.from("games").select("*").eq("id", sessionId).maybeSingle(),
        supabase
          .from("scout_observations")
          .select(
            "id, inning, is_team_level, jersey_number, tags, key_play, steal_it, applies_to_team, pitcher_id, created_at",
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
        supabase
          .from("pitchers")
          .select("id, jersey_number, team_side")
          .eq("game_id", sessionId),
        supabase
          .from("diamond_decision_responses")
          .select("inning, prompt_key, prompt_text, response")
          .eq("game_id", sessionId)
          .eq("player_id", user.id)
          .order("inning", { ascending: true }),
      ]);
      if (!cancel) {
        setGame((g as GameRow | null) ?? null);
        setObs((o as Obs[]) ?? []);
        setAtBats((a as unknown as AtBat[]) ?? []);
        setPitchers((p as PitcherRow[] | null) ?? []);
        setDiamond((d as DiamondResponse[] | null) ?? []);
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

  const inningSet = new Set<number>();
  for (const o of obs) inningSet.add(o.inning);
  for (const d of diamond) inningSet.add(d.inning);
  const innings = Array.from(inningSet).sort((a, b) => a - b);
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
        {game.learning_focuses && game.learning_focuses.length > 0 && (
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">Today's focus: </span>
            <span className="font-medium">{game.learning_focuses.join(" · ")}</span>
          </p>
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
              const dRows = diamond.filter((d) => d.inning === i);
              if (rows.length === 0 && dRows.length === 0) return null;
              const inningLabel =
                i === 0 ? "Pre-game" : i === 99 ? "Post-game reflection" : `Inning ${i}`;
              return (
                <div key={i} className="rounded-xl border bg-card p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {inningLabel}
                  </p>
                  {rows.length > 0 && (
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
                  )}
                  {dRows.length > 0 && (
                    <div className={rows.length > 0 ? "mt-3" : ""}>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground/80">
                        Diamond Decisions
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        {dRows.map((d) => (
                          <li key={d.prompt_key}>
                            <p className="text-xs text-muted-foreground">{d.prompt_text}</p>
                            <p className="italic">→ "{d.response}"</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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

      {(() => {
        // Pitcher Summary — honest grouping only.
        const teamName = (side: "my_team" | "opponent" | null) =>
          side === "my_team" ? game.home_team : side === "opponent" ? game.away_team : null;

        // 1. Aggregate observation tag counts per pitcher_id.
        const tagCounts: Record<string, Record<string, number>> = {};
        for (const o of obs) {
          if (!o.pitcher_id || !o.tags) continue;
          for (const t of o.tags) {
            if (!PITCHING_TAG_SET.has(t)) continue;
            tagCounts[o.pitcher_id] ??= {};
            tagCounts[o.pitcher_id][t] = (tagCounts[o.pitcher_id][t] ?? 0) + 1;
          }
        }

        // 2. Attribute at-bat pitch_counts to pitcher only when exactly one pitcher
        //    exists in this session for the opposing team_side.
        const pitchCountsByPitcher: Record<string, Record<string, number>> = {};
        let skippedAtBats = 0;
        for (const ab of atBats) {
          if (!ab.batter_team || !ab.pitch_counts) continue;
          const opposing: "my_team" | "opponent" =
            ab.batter_team === "my_team" ? "opponent" : "my_team";
          const candidates = pitchers.filter((p) => p.team_side === opposing);
          if (candidates.length !== 1) {
            if (Object.keys(ab.pitch_counts).length > 0) skippedAtBats++;
            continue;
          }
          const pid = candidates[0].id;
          for (const [slug, v] of Object.entries(ab.pitch_counts)) {
            if (typeof v !== "number" || v <= 0) continue;
            pitchCountsByPitcher[pid] ??= {};
            pitchCountsByPitcher[pid][slug] = (pitchCountsByPitcher[pid][slug] ?? 0) + v;
          }
        }

        // 3. Render only pitchers we actually have data or identity for.
        const visiblePitchers = pitchers.filter((p) => p.team_side !== null);

        return (
          <section>
            <h2 className="mb-2 text-sm font-semibold">Pitcher Summary</h2>
            {visiblePitchers.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                No pitchers identified this session. Add the current pitcher in Observe to enable
                pitcher rollups.
              </p>
            ) : (
              <ul className="space-y-2">
                {visiblePitchers.map((p) => {
                  const tags = tagCounts[p.id] ?? {};
                  const pitchC = pitchCountsByPitcher[p.id] ?? {};
                  const tagEntries = Object.entries(tags);
                  const pitchEntries = Object.entries(pitchC);
                  return (
                    <li key={p.id} className="rounded-xl border bg-card p-3 text-sm">
                      <p className="font-semibold">
                        #{p.jersey_number}
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          · {teamName(p.team_side)}
                        </span>
                      </p>
                      {tagEntries.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {tagEntries.map(([tag, n]) => (
                            <span
                              key={tag}
                              className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                            >
                              {tag} ×{n}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">No pitching tags yet.</p>
                      )}
                      {pitchEntries.length > 0 && (
                        <div className="mt-1.5">
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            From at-bats
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {pitchEntries.map(([slug, n]) => (
                              <span
                                key={slug}
                                className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium"
                              >
                                {pitchLabel(slug)} ×{n}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {skippedAtBats > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Some at-bat pitch counts not attributed — multiple pitchers seen for that team.
              </p>
            )}
          </section>
        );
      })()}

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
