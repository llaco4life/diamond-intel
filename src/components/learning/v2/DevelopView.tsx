import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Check, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GameRow } from "@/hooks/useActiveGame";

interface Suggestion {
  id: string;
  text: string;
  added: boolean;
}

export function DevelopView({ game }: { game: GameRow }) {
  const { user, org } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      // Pull reflection answers from this session as candidate goals.
      const { data: ab } = await supabase
        .from("at_bats")
        .select("notes")
        .eq("game_id", game.id)
        .eq("player_id", user.id)
        .eq("inning", 99);

      const { data: dd } = await supabase
        .from("diamond_decision_responses")
        .select("response, prompt_key")
        .eq("game_id", game.id)
        .eq("player_id", user.id)
        .eq("inning", 99);

      const { data: si } = await supabase
        .from("scout_observations")
        .select("steal_it")
        .eq("game_id", game.id)
        .eq("player_id", user.id)
        .eq("inning", 99)
        .not("steal_it", "is", null);

      if (cancel) return;

      const seeds: string[] = [];
      for (const r of ab ?? []) {
        if (!r.notes) continue;
        for (const line of r.notes.split("\n")) {
          const t = line.replace(/^(What happened|What I missed|Focus execution):\s*/i, "").trim();
          if (t.length >= 8) seeds.push(t);
        }
      }
      for (const r of dd ?? []) if (r.response?.trim()) seeds.push(r.response.trim());
      for (const r of si ?? []) if (r.steal_it?.trim()) seeds.push(`Steal: ${r.steal_it.trim()}`);

      // Dedupe
      const seen = new Set<string>();
      const unique: Suggestion[] = [];
      for (const s of seeds) {
        const k = s.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        unique.push({ id: crypto.randomUUID(), text: s, added: false });
        if (unique.length >= 6) break;
      }
      setSuggestions(unique);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [game.id, user]);

  const addGoal = async (text: string, suggestionId?: string) => {
    if (!user || !org) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const { error } = await supabase.from("development_items").insert({
      org_id: org.id,
      player_id: user.id,
      source_game_id: game.id,
      source_note: trimmed,
      status: "working_on",
    });
    if (error) {
      toast.error("Could not add goal");
      return;
    }
    toast.success("Added to your development goals");
    if (suggestionId) {
      setSuggestions((prev) =>
        prev.map((s) => (s.id === suggestionId ? { ...s, added: true } : s)),
      );
    } else {
      setCustom("");
    }
  };

  const finish = async () => {
    setFinishing(true);
    const { error } = await supabase
      .from("games")
      .update({ learning_phase: "ended", status: "ended" })
      .eq("id", game.id);
    setFinishing(false);
    if (error) {
      toast.error("Could not finish");
      return;
    }
    toast.success("Session complete");
    navigate({ to: "/learning/summary/$sessionId", params: { sessionId: game.id } });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pt-4 pb-24">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Development Goals · Step 3 of 3
        </p>
        <h1 className="mt-1 text-2xl font-bold">Turn reflection into reps</h1>
        <p className="text-sm text-muted-foreground">
          Pick what you'll work on this week. You can edit and add more later in Development.
        </p>
      </header>

      <section className="rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Suggested from your reflection</h2>
        </div>

        {loading ? (
          <div className="mt-3 h-20 animate-pulse rounded-xl bg-muted/50" />
        ) : suggestions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No reflection notes detected. Add a custom goal below.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {suggestions.map((s) => (
              <li
                key={s.id}
                className="flex items-start justify-between gap-3 rounded-xl border bg-background p-3"
              >
                <p className="min-w-0 flex-1 text-sm">{s.text}</p>
                {s.added ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success">
                    <Check className="h-3.5 w-3.5" /> Added
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addGoal(s.text, s.id)}
                    className="shrink-0"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Goal
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <Label htmlFor="custom-goal" className="text-sm font-semibold">
          Add a custom goal
        </Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="custom-goal"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="e.g. Finish two-strike at-bats with a battle approach"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addGoal(custom);
              }
            }}
          />
          <Button onClick={() => addGoal(custom)} disabled={!custom.trim()}>
            Add
          </Button>
        </div>
      </section>

      <Button size="lg" className="w-full" onClick={finish} disabled={finishing}>
        {finishing ? "Finishing…" : "Finish session"}
      </Button>
    </div>
  );
}
