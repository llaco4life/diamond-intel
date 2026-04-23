import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GameRow } from "@/hooks/useActiveGame";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Sparkles, Plus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Context = "Watching a game" | "Live practice" | "Scrimmage";
const CONTEXTS: Context[] = ["Watching a game", "Live practice", "Scrimmage"];

const PRESET_FOCUSES = [
  "Two-strike discipline",
  "Pitch recognition",
  "Confidence after mistakes",
  "Aggressive baserunning",
  "Leadership",
  "Situational awareness",
] as const;

const MAX_FOCUSES = 2;

export function LearningSetup({
  onCancel,
  onCreated,
}: {
  onCancel?: () => void;
  onCreated?: (game: GameRow) => void;
}) {
  const { user, org } = useAuth();
  const [focuses, setFocuses] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [context, setContext] = useState<Context>("Watching a game");
  const [myTeam, setMyTeam] = useState("");
  const [opponentContext, setOpponentContext] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (org?.name && !myTeam) setMyTeam(org.name);
  }, [org, myTeam]);

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

  const create = async (skipFocus: boolean) => {
    if (!user || !org) return;
    if (!skipFocus && focuses.length === 0) {
      toast.error("Pick at least one focus, or use Skip focus for now.");
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
          home_team: myTeam.trim() || "My team",
          away_team: opponentContext.trim() || "TBD",
          game_date: date,
          is_timed: false,
          time_limit_minutes: null,
          timer_started_at: null,
          current_inning: 1,
          status: "active",
          created_by: user.id,
          learning_phase: "prep",
          learning_focuses: skipFocus ? [] : focuses,
        })
        .select("*")
        .single();
      if (error) throw error;
      toast.success("Session started — let's prep.");
      onCreated?.(data as GameRow);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start session");
    } finally {
      setSubmitting(false);
    }
  };

  const customFocuses = focuses.filter(
    (f) => !PRESET_FOCUSES.includes(f as (typeof PRESET_FOCUSES)[number]),
  );

  return (
    <div className="mx-auto max-w-xl px-4 pt-8 pb-10">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mb-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to lobby
        </button>
      )}

      {/* Section 1 — Today's Focus (hero) */}
      <section className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Today's focus
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          What are you working on today?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick 1–2 focus areas. This is what today is really about.
        </p>

        {suggestion && !focuses.includes(suggestion) && (
          <button
            type="button"
            onClick={() => toggle(suggestion)}
            className="mt-4 flex w-full items-start gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary-soft/30 p-3 text-left transition-colors hover:border-primary/60 hover:bg-primary-soft/50"
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

        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-xs font-medium text-muted-foreground">Focus areas</span>
          <span className="text-xs text-muted-foreground">
            {focuses.length}/{MAX_FOCUSES}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
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

        {customFocuses.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {customFocuses.map((f) => (
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
            placeholder="Add a custom focus…"
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

      {/* Section 2 — Session Context (secondary) */}
      <section className="mt-5 space-y-4 rounded-2xl border bg-card/60 p-5">
        <div>
          <h2 className="text-sm font-semibold">Session context</h2>
          <p className="text-xs text-muted-foreground">
            Optional details — helps you find this session later.
          </p>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Context</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {CONTEXTS.map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={context === c ? "default" : "outline"}
                onClick={() => setContext(c)}
                className="flex-1 min-w-[110px]"
              >
                {c}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="my-team" className="text-xs text-muted-foreground">
              My team <span className="text-muted-foreground/70">(optional)</span>
            </Label>
            <Input
              id="my-team"
              value={myTeam}
              onChange={(e) => setMyTeam(e.target.value)}
              placeholder="e.g. Unity Perez 14U"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="opponent-context" className="text-xs text-muted-foreground">
              Opponent / Team Context{" "}
              <span className="text-muted-foreground/70">(optional)</span>
            </Label>
            <Input
              id="opponent-context"
              value={opponentContext}
              onChange={(e) => setOpponentContext(e.target.value)}
              placeholder="Lightning 14U, drill partner, scrimmage…"
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="date" className="text-xs text-muted-foreground">
            Date
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1.5 max-w-44"
          />
        </div>
      </section>

      {/* CTAs */}
      <div className="mt-6 space-y-2">
        <Button
          onClick={() => create(false)}
          disabled={submitting || focuses.length === 0}
          size="lg"
          className="w-full"
        >
          {submitting ? "Starting…" : "Begin Pre-Game Prep →"}
        </Button>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => create(true)}
            disabled={submitting}
            className="text-xs text-muted-foreground/70 underline-offset-4 hover:text-muted-foreground hover:underline disabled:opacity-50"
          >
            Skip focus for now
          </button>
        </div>
      </div>
    </div>
  );
}
