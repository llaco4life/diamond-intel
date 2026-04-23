import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GameRow } from "@/hooks/useActiveGame";

export function GameSetup({
  onCancel,
  onCreated,
}: { onCancel?: () => void; onCreated?: (game: GameRow) => void } = {}) {
  const { user, org } = useAuth();
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [tournament, setTournament] = useState("");
  const [isTimed, setIsTimed] = useState(false);
  const [minutes, setMinutes] = useState("90");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (org && !homeTeam) setHomeTeam(org.name);
  }, [org, homeTeam]);

  const start = async () => {
    if (!user || !org) return;
    if (!homeTeam.trim() || !awayTeam.trim()) {
      toast.error("Home and away team names are required");
      return;
    }
    // Away Team is the canonical opponent identity for scouting history.
    const opponentName = awayTeam.trim();
    setSubmitting(true);
    try {
      let opponentId: string | null = null;
      const { data: existing } = await supabase
        .from("opponents")
        .select("id")
        .eq("org_id", org.id)
        .eq("team_name", opponentName)
        .maybeSingle();
      if (existing?.id) {
        opponentId = existing.id;
      } else {
        const { data: created, error: oErr } = await supabase
          .from("opponents")
          .insert({ org_id: org.id, team_name: opponentName })
          .select("id")
          .single();
        if (oErr) throw oErr;
        opponentId = created.id;
      }

      const { data: createdGame, error: gErr } = await supabase
        .from("games")
        .insert({
          org_id: org.id,
          opponent_id: opponentId,
          game_type: "scout",
          tournament_name: tournament.trim() || null,
          home_team: homeTeam.trim(),
          away_team: awayTeam.trim(),
          is_timed: isTimed,
          time_limit_minutes: isTimed ? parseInt(minutes, 10) || null : null,
          timer_started_at: isTimed ? new Date().toISOString() : null,
          current_inning: 1,
          status: "active",
          created_by: user.id,
        })
        .select("*")
        .single();
      if (gErr) throw gErr;
      // Hand the row back so the parent can enter ActiveGame immediately.
      // Toast is fired by the parent after the transition so feedback
      // matches the visible state change.
      onCreated?.(createdGame as GameRow);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start game");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 pt-8 pb-6">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mb-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to lobby
        </button>
      )}
      <h1 className="mb-1 text-2xl font-bold tracking-tight">New Scout Game</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Set up a scouting game. Your team will see it instantly.
      </p>

      <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-card">
        <div>
          <Label htmlFor="home-team">Home team name</Label>
          <Input
            id="home-team"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            placeholder="Your team name"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="away-team">Away team name</Label>
          <Input
            id="away-team"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            placeholder="Opponent team name"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="tourney">Tournament name (optional)</Label>
          <Input
            id="tourney"
            value={tournament}
            onChange={(e) => setTournament(e.target.value)}
            placeholder="e.g. Summer Showcase"
            className="mt-1.5"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="timed" className="cursor-pointer">
            Timed game
          </Label>
          <Switch id="timed" checked={isTimed} onCheckedChange={setIsTimed} />
        </div>

        {isTimed && (
          <div>
            <Label htmlFor="mins">Time limit (minutes)</Label>
            <Input
              id="mins"
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="mt-1.5 max-w-32"
            />
          </div>
        )}

        <Button onClick={start} disabled={submitting} size="lg" className="w-full">
          {submitting ? "Starting…" : "Start Game"}
        </Button>
      </section>
    </div>
  );
}
