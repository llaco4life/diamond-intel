import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GameRow } from "@/hooks/useActiveGame";
import { REFLECT_PROMPTS } from "@/lib/diamondDecisions";
import { PhasePromptsCard } from "./PhasePromptsCard";

export function ReflectView({
  game,
  onAdvance,
}: {
  game: GameRow;
  onAdvance: (g: GameRow) => void;
}) {
  const { user } = useAuth();
  const [happened, setHappened] = useState("");
  const [missed, setMissed] = useState("");
  const [stealIt, setStealIt] = useState("");
  const [executed, setExecuted] = useState(3);
  const [executedNote, setExecutedNote] = useState("");
  const [batterNumber, setBatterNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const focuses = game.learning_focuses ?? [];

  const saveAtBat = async () => {
    if (!user) return;
    if (!happened.trim() && !missed.trim() && !executedNote.trim()) {
      toast.error("Add at least one reflection field");
      return;
    }
    setSubmitting(true);
    try {
      const notes = [
        happened.trim() && `What happened: ${happened.trim()}`,
        missed.trim() && `What I missed: ${missed.trim()}`,
        executedNote.trim() && `Focus execution: ${executedNote.trim()}`,
      ]
        .filter(Boolean)
        .join("\n");

      const { error: abErr } = await supabase.from("at_bats").insert({
        game_id: game.id,
        player_id: user.id,
        inning: 99,
        confidence_level: 3,
        execution: executed,
        mental_focus: 3,
        batter_number: batterNumber.trim() || null,
        batter_team: "my_team",
        notes,
        pitch_counts: {},
      });
      if (abErr) throw abErr;

      if (stealIt.trim()) {
        const { error: stErr } = await supabase.from("scout_observations").insert({
          game_id: game.id,
          player_id: user.id,
          inning: 99,
          is_team_level: true,
          tags: [],
          steal_it: stealIt.trim(),
          applies_to_team: game.away_team,
          offensive_team: game.away_team,
        });
        if (stErr) throw stErr;
      }

      toast.success("Reflection saved");
      setHappened("");
      setMissed("");
      setStealIt("");
      setExecutedNote("");
      setBatterNumber("");
      setExecuted(3);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save reflection");
    } finally {
      setSubmitting(false);
    }
  };

  const advance = async () => {
    setAdvancing(true);
    const { data, error } = await supabase
      .from("games")
      .update({ learning_phase: "develop" })
      .eq("id", game.id)
      .select("*")
      .single();
    setAdvancing(false);
    if (error || !data) {
      toast.error("Could not advance");
      return;
    }
    onAdvance(data as GameRow);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pt-4 pb-24">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Post-Game Reflection · Step 2 of 3
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          {game.home_team} <span className="text-muted-foreground">vs</span> {game.away_team}
        </h1>
        {focuses.length > 0 && (
          <p className="mt-1 text-sm">
            <span className="text-muted-foreground">Today's focus: </span>
            <span className="font-medium">{focuses.join(" · ")}</span>
          </p>
        )}
      </header>

      <section className="rounded-2xl border bg-card p-4 space-y-4">
        <div>
          <h2 className="text-base font-semibold">At-bat reflection</h2>
          <p className="text-xs text-muted-foreground">
            Add as many as you want — one save per at-bat.
          </p>
        </div>

        <div>
          <Label htmlFor="ab-num">At-bat # (optional)</Label>
          <Input
            id="ab-num"
            value={batterNumber}
            onChange={(e) => setBatterNumber(e.target.value)}
            placeholder="e.g. 1, 2, 3…"
            className="mt-1.5 max-w-32"
          />
        </div>

        <div>
          <Label htmlFor="happened">What happened?</Label>
          <Textarea
            id="happened"
            value={happened}
            onChange={(e) => setHappened(e.target.value)}
            placeholder="Walked in 2 strikes after fouling off two…"
            className="mt-1.5 min-h-20"
          />
        </div>

        <div>
          <Label htmlFor="missed">What did I miss?</Label>
          <Textarea
            id="missed"
            value={missed}
            onChange={(e) => setMissed(e.target.value)}
            placeholder="Got beat by the change-up — wasn't sitting on it."
            className="mt-1.5 min-h-20"
          />
        </div>

        <div>
          <Label htmlFor="steal">What should I steal?</Label>
          <Textarea
            id="steal"
            value={stealIt}
            onChange={(e) => setStealIt(e.target.value)}
            placeholder="Catcher tipped location — set up early."
            className="mt-1.5 min-h-16"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Saved into your Steal It list for this session.
          </p>
        </div>

        {focuses.length > 0 && (
          <div>
            <Label>Did I execute my focus? ({executed}/5)</Label>
            <Slider
              value={[executed]}
              onValueChange={(v) => setExecuted(v[0])}
              min={1}
              max={5}
              step={1}
              className="mt-3"
            />
            <Textarea
              value={executedNote}
              onChange={(e) => setExecutedNote(e.target.value)}
              placeholder="One sentence on how the focus showed up (or didn't)…"
              className="mt-2 min-h-16"
            />
          </div>
        )}

        <Button onClick={saveAtBat} className="w-full" disabled={submitting}>
          {submitting ? "Saving…" : "Save reflection"}
        </Button>
      </section>

      <PhasePromptsCard
        gameId={game.id}
        inning={99}
        prompts={REFLECT_PROMPTS}
        title="Post-Game Decisions"
        subtitle="Wrap-up reads — close the loop."
      />

      <Button size="lg" className="w-full" onClick={advance} disabled={advancing}>
        Save reflection & set development goals
      </Button>
    </div>
  );
}
