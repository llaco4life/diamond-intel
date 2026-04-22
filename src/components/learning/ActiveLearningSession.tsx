import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useMyInning } from "@/hooks/useMyInning";
import { supabase } from "@/integrations/supabase/client";
import type { GameRow } from "@/hooks/useActiveGame";
import { LearningSessionHeader } from "./LearningSessionHeader";
import { LearningObserveTab } from "./LearningObserveTab";
import { LearningStealTab } from "./LearningStealTab";
import { AtBatLogButton } from "./AtBatLogButton";

export function ActiveLearningSession({ game: initial }: { game: GameRow }) {
  const { user } = useAuth();
  const [game, setGame] = useState<GameRow>(initial);
  const [tab, setTab] = useState("observe");
  const [inning, setInning] = useMyInning(initial.id, user?.id ?? null, initial.current_inning);

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

  if (!user) return null;

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      <LearningSessionHeader game={game} inning={inning} />
      <div className="mx-auto max-w-2xl px-4 pt-4 pb-24">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="observe" className="py-2">
              Observe
            </TabsTrigger>
            <TabsTrigger value="steal" className="py-2">
              Steal It
            </TabsTrigger>
          </TabsList>
          <TabsContent value="observe" className="mt-4">
            <LearningObserveTab
              gameId={game.id}
              inning={inning}
              onInningChange={setInning}
              homeTeam={game.home_team}
              awayTeam={game.away_team}
            />
          </TabsContent>
          <TabsContent value="steal" className="mt-4">
            <LearningStealTab gameId={game.id} inning={inning} />
          </TabsContent>
        </Tabs>
      </div>
      <AtBatLogButton
        gameId={game.id}
        inning={inning}
        homeTeam={game.home_team}
        awayTeam={game.away_team}
      />
    </div>
  );
}
