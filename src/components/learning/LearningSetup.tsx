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
  const [myTeam, setMyTeam] = useState("");
  const [opponent, setOpponent] = useState("");
  const [context, setContext] = useState<Context>("Watching a game");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isTimed, setIsTimed] = useState(false);
  const [minutes, setMinutes] = useState("90");
  const [submitting, setSubmitting] = useState(false);

  const start = async () => {
    if (!user || !org) return;
    if (!myTeam.trim()) {
      toast.error("Please add your team name.");
      return;
    }
    setSubmitting(true);
    try {
      const awayLabel = opponent.trim() || context;
      const { data, error } = await supabase
        .from("games")
        .insert({
          org_id: org.id,
          opponent_id: null,
          game_type: "learning",
          tournament_name: context,
          home_team: myTeam.trim(),
          away_team: awayLabel,
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
          <Label htmlFor="my-team">My team</Label>
          <Input
            id="my-team"
            value={myTeam}
            onChange={(e) => setMyTeam(e.target.value)}
            placeholder="e.g. Unity Perez 14U"
            className="mt-1.5"
          />
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
          <Label htmlFor="opp">Opponent / team you're watching (optional)</Label>
          <Input
            id="opp"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="Defaults to context"
            className="mt-1.5"
          />
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
