import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { GameRow } from "@/hooks/useActiveGame";
import { LearningSessionHeader } from "./LearningSessionHeader";
import { PrepView } from "./v2/PrepView";
import { LiveQuickView } from "./v2/LiveQuickView";
import { ReflectView } from "./v2/ReflectView";
import { DevelopView } from "./v2/DevelopView";
import { useNavigate } from "@tanstack/react-router";

/**
 * Phase router for V2 learning sessions.
 *   prep    → PrepView      (focus picker + pre-game Diamond Decisions)
 *   live    → LiveQuickView (slimmed quick tags + Steal It)
 *   reflect → ReflectView   (at-bat reflection + post-game Diamond Decisions)
 *   develop → DevelopView   (suggested goals → development_items)
 *   ended   → redirect to summary
 */
export function ActiveLearningSession({ game: initial }: { game: GameRow }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameRow>(initial);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("games").select("*").eq("id", initial.id).maybeSingle();
    if (data) setGame(data as GameRow);
  }, [initial.id]);

  useEffect(() => {
    setGame(initial);
  }, [initial]);

  useEffect(() => {
    const channel = supabase
      .channel(`learning-${initial.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${initial.id}` },
        () => reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [initial.id, reload]);

  useEffect(() => {
    if (game.learning_phase === "ended" || game.status === "ended") {
      navigate({ to: "/learning/summary/$sessionId", params: { sessionId: game.id } });
    }
  }, [game.learning_phase, game.status, game.id, navigate]);

  if (!user) return null;

  const phase = game.learning_phase ?? "live";

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      <LearningSessionHeader game={game} inning={game.current_inning ?? 1} />
      {phase === "prep" && <PrepView game={game} onAdvance={setGame} />}
      {phase === "live" && <LiveQuickView game={game} onAdvance={setGame} />}
      {phase === "reflect" && <ReflectView game={game} onAdvance={setGame} />}
      {phase === "develop" && <DevelopView game={game} />}
    </div>
  );
}
