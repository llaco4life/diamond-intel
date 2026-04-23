import { useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { enqueue } from "@/lib/offlineQueue";
import type { DiamondPrompt } from "@/lib/diamondDecisions";

type SaveState = "idle" | "saving" | "saved" | "queued";

/**
 * Phase-bound Diamond Decisions card. Stores responses at a fixed inning slot
 * (0 for pre-game, 99 for post-game reflection) so they don't collide with
 * any in-game inning prompts.
 */
export function PhasePromptsCard({
  gameId,
  inning,
  prompts,
  title,
  subtitle,
}: {
  gameId: string;
  inning: number;
  prompts: DiamondPrompt[];
  title: string;
  subtitle?: string;
}) {
  const { user } = useAuth();
  const promptList = useMemo(() => prompts, [prompts]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [states, setStates] = useState<Record<string, SaveState>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      const keys = promptList.map((p) => p.key);
      const { data } = await supabase
        .from("diamond_decision_responses")
        .select("prompt_key, response")
        .eq("game_id", gameId)
        .eq("player_id", user.id)
        .eq("inning", inning)
        .in("prompt_key", keys);
      if (cancel) return;
      const next: Record<string, string> = {};
      const nextStates: Record<string, SaveState> = {};
      for (const row of data ?? []) {
        next[row.prompt_key] = row.response;
        nextStates[row.prompt_key] = "saved";
      }
      setValues(next);
      setStates(nextStates);
    })();
    return () => {
      cancel = true;
      for (const t of Object.values(timers.current)) clearTimeout(t);
      timers.current = {};
    };
  }, [gameId, user, inning, promptList]);

  const persist = async (prompt: DiamondPrompt, response: string) => {
    if (!user) return;
    const trimmed = response.trim();
    if (!trimmed) return;
    setStates((s) => ({ ...s, [prompt.key]: "saving" }));
    const payload = {
      game_id: gameId,
      player_id: user.id,
      inning,
      prompt_key: prompt.key,
      prompt_text: prompt.text,
      response: trimmed,
    };
    try {
      const { error } = await supabase
        .from("diamond_decision_responses")
        .upsert(payload, { onConflict: "game_id,player_id,inning,prompt_key" });
      if (error) throw error;
      setStates((s) => ({ ...s, [prompt.key]: "saved" }));
    } catch {
      await enqueue({
        id: crypto.randomUUID(),
        table: "diamond_decision_responses",
        payload,
        createdAt: Date.now(),
      });
      setStates((s) => ({ ...s, [prompt.key]: "queued" }));
    }
  };

  const onChange = (prompt: DiamondPrompt, val: string) => {
    setValues((v) => ({ ...v, [prompt.key]: val }));
    setStates((s) => ({ ...s, [prompt.key]: "idle" }));
    if (timers.current[prompt.key]) clearTimeout(timers.current[prompt.key]);
    timers.current[prompt.key] = setTimeout(() => persist(prompt, val), 600);
  };

  const onBlur = (prompt: DiamondPrompt) => {
    if (timers.current[prompt.key]) {
      clearTimeout(timers.current[prompt.key]);
      delete timers.current[prompt.key];
    }
    persist(prompt, values[prompt.key] ?? "");
  };

  if (promptList.length === 0) return null;

  return (
    <section className="rounded-2xl border-2 border-accent/40 bg-accent/5 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
        <Lightbulb className="h-3.5 w-3.5" />
        {title}
      </div>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-3 space-y-3">
        {promptList.map((p) => {
          const state = states[p.key] ?? "idle";
          return (
            <div key={p.key}>
              <div className="flex items-start justify-between gap-2">
                <Label htmlFor={`pp-${p.key}`} className="text-sm font-medium leading-snug">
                  {p.text}
                </Label>
                {state === "saved" && (
                  <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                )}
                {state === "saving" && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">Saving…</span>
                )}
                {state === "queued" && (
                  <span className="shrink-0 text-[10px] font-medium text-warning">Queued</span>
                )}
              </div>
              <Textarea
                id={`pp-${p.key}`}
                rows={2}
                value={values[p.key] ?? ""}
                onChange={(e) => onChange(p, e.target.value)}
                onBlur={() => onBlur(p)}
                placeholder="Your read…"
                className="mt-1 min-h-[3.5rem] resize-none text-sm"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
