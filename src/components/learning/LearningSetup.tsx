import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { GameRow } from "@/hooks/useActiveGame";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Context = "Watching a game" | "Live practice" | "Scrimmage";
const CONTEXTS: Context[] = ["Watching a game", "Live practice", "Scrimmage"];

export function LearningSetup({
  onCancel,
  onCreated,
}: {
  onCancel?: () => void;
  onCreated?: (game: GameRow) => void;
}) {
  const { user, org } = useAuth();
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [context, setContext] = useState<Context>("Watching a game");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isTimed, setIsTimed] = useState(false);
  const [minutes, setMinutes] = useState("90");
  const [submitting, setSubmitting] = useState(false);

  const start = async () => {
    if (!user || !org) return;
    if (!homeTeam.trim() || !awayTeam.trim()) {
      toast.error("Please add both home and away team names.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("games")
        .insert({
          org_id: org.id,
          opponent_id: null,
          game_type: "learning",
          tournament_name: context,
          home_team: homeTeam.trim(),
          away_team: awayTeam.trim(),
          game_date: date,
          is_timed: isTimed,
          time_limit_minutes: isTimed ? parseInt(minutes, 10) || null : null,
          timer_started_at: isTimed ? new Date().toISOString() : null,
          current_inning: 1,
          status: "active",
          created_by: user.id,
        })
        .select("*")
        .single();
      if (error) throw error;
      toast.success("Learning session started");
      onCreated?.(data as GameRow);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start session");
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
      <h1 className="mb-1 text-2xl font-bold tracking-tight">New Learning Session</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Personal session — only you see your notes.
      </p>

      <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-card">
        <div>
          <Label htmlFor="home-team">Home team</Label>
          <Input
            id="home-team"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            placeholder="e.g. Unity Perez 14U"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="away-team">Away team</Label>
          <Input
            id="away-team"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            placeholder="e.g. Lightning 14U"
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            You can swap home/away later if you got it backwards.
          </p>
        </div>

        <div>
          <Label>Context</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {CONTEXTS.map((c) => (
              <Button
                key={c}
                type="button"
                variant={context === c ? "default" : "outline"}
                onClick={() => setContext(c)}
                className="flex-1 min-w-[120px]"
              >
                {c}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1.5 max-w-44"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="timed" className="cursor-pointer">
            Timed session
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
          {submitting ? "Starting…" : "Start Session"}
        </Button>
      </section>
    </div>
  );
}
