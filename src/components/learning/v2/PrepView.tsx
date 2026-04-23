import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Sparkles, Plus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GameRow } from "@/hooks/useActiveGame";
import { PREP_PROMPTS } from "@/lib/diamondDecisions";
import { PhasePromptsCard } from "./PhasePromptsCard";

const PRESET_FOCUSES = [
  "Two-strike discipline",
  "Pitch recognition",
  "Confidence after mistakes",
  "Aggressive baserunning",
  "Leadership",
  "Situational awareness",
] as const;

const MAX_FOCUSES = 2;

export function PrepView({ game, onAdvance }: { game: GameRow; onAdvance: (g: GameRow) => void }) {
  const { user } = useAuth();
  const [focuses, setFocuses] = useState<string[]>(game.learning_focuses ?? []);
  const [custom, setCustom] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("development_items")
        .select("source_note")
        .eq("player_id", user.id)
        .eq("status", "working_on")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data?.source_note) setSuggestion(data.source_note);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggle = (f: string) => {
    setFocuses((cur) => {
      if (cur.includes(f)) return cur.filter((x) => x !== f);
      if (cur.length >= MAX_FOCUSES) {
        toast.message("Pick at most 2", { description: "Tap a selected focus to swap it out." });
        return cur;
      }
      return [...cur, f];
    });
  };

  const addCustom = () => {
    const t = custom.trim();
    if (!t) return;
    if (focuses.includes(t)) {
      setCustom("");
      return;
    }
    if (focuses.length >= MAX_FOCUSES) {
      toast.message("Pick at most 2");
      return;
    }
    setFocuses((cur) => [...cur, t]);
    setCustom("");
  };

  const lockPrep = async (target: "live" | "reflect") => {
    if (!user) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("games")
      .update({ learning_focuses: focuses, learning_phase: target })
      .eq("id", game.id)
      .select("*")
      .single();
    setSubmitting(false);
    if (error || !data) {
      toast.error("Could not save prep");
      return;
    }
    toast.success(target === "live" ? "Prep locked. Game on." : "Prep saved. Reflect when ready.");
    onAdvance(data as GameRow);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pt-4 pb-24">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Pre-Game Prep · Step 1 of 3
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          {game.home_team} <span className="text-muted-foreground">vs</span> {game.away_team}
        </h1>
        <p className="text-sm text-muted-foreground">
          {game.tournament_name ?? "Learning"} · {new Date(game.game_date).toLocaleDateString()}
        </p>
      </header>

      <section className="rounded-2xl border bg-card p-4">
        <div className="flex items-baseline justify-between">
          <Label className="text-base font-semibold">Today's focus</Label>
          <span className="text-xs text-muted-foreground">{focuses.length}/{MAX_FOCUSES}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pick up to 2 things you want to lock in today.
        </p>

        {suggestion && !focuses.includes(suggestion) && (
          <button
            type="button"
            onClick={() => toggle(suggestion)}
            className="mt-3 flex w-full items-start gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary-soft/30 p-3 text-left transition-colors hover:border-primary/60 hover:bg-primary-soft/50"
          >
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Suggested from your active goal
              </p>
              <p className="mt-0.5 text-sm">{suggestion}</p>
            </div>
          </button>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {PRESET_FOCUSES.map((f) => {
            const sel = focuses.includes(f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggle(f)}
                className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  sel
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                {sel && <Check className="h-3.5 w-3.5" />}
                {f}
              </button>
            );
          })}
        </div>

        {focuses.some((f) => !PRESET_FOCUSES.includes(f as typeof PRESET_FOCUSES[number]) && f !== suggestion) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {focuses
              .filter((f) => !PRESET_FOCUSES.includes(f as typeof PRESET_FOCUSES[number]))
              .map((f) => (
                <span
                  key={f}
                  className="flex items-center gap-1 rounded-full border border-primary bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                >
                  <Check className="h-3.5 w-3.5" />
                  {f}
                  <button type="button" onClick={() => toggle(f)} aria-label={`Remove ${f}`}>
                    <X className="h-3.5 w-3.5 opacity-80" />
                  </button>
                </span>
              ))}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Custom focus…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addCustom} disabled={!custom.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <PhasePromptsCard
        gameId={game.id}
        inning={0}
        prompts={PREP_PROMPTS}
        title="Pre-Game Decisions"
        subtitle="Prime your awareness — quick reads, not essays."
      />

      <div className="space-y-2">
        <Button
          size="lg"
          className="w-full"
          disabled={submitting}
          onClick={() => lockPrep("live")}
        >
          Lock prep & start game
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          disabled={submitting}
          onClick={() => lockPrep("reflect")}
        >
          Skip live → go straight to reflection
        </Button>
      </div>
    </div>
  );
}
