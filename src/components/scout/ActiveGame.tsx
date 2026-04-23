import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActiveGameHeader } from "./ActiveGameHeader";
import { ObserveTab } from "./ObserveTab";
import { PitcherTab } from "./PitcherTab";
import { MyJobTab } from "./MyJobTab";
import { StealItTab } from "./StealItTab";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { GameRow } from "@/hooks/useActiveGame";

export function ActiveGame({
  game: initial,
  isCoach,
}: {
  game: GameRow;
  isCoach: boolean;
}) {
  const { user } = useAuth();
  const [game, setGame] = useState<GameRow>(initial);
  const [tab, setTab] = useState("observe");

  const reload = useCallback(async () => {
    const { data } = await supabase.from("games").select("*").eq("id", initial.id).maybeSingle();
    if (data) setGame(data as GameRow);
  }, [initial.id]);

  useEffect(() => {
    setGame(initial);
  }, [initial]);

  useEffect(() => {
    const channel = supabase
      .channel(`game-${initial.id}`)
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
      <ActiveGameHeader game={game} isCoach={isCoach} onRefresh={reload} />
      <div className="mx-auto max-w-2xl px-4 pt-4 pb-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="observe" className="py-2">Observe</TabsTrigger>
            <TabsTrigger value="pitcher" className="py-2">Pitcher</TabsTrigger>
            <TabsTrigger value="myjob" className="py-2">My Job</TabsTrigger>
            <TabsTrigger value="steal" className="py-2">Steal It</TabsTrigger>
          </TabsList>
          <TabsContent value="observe" className="mt-4">
            <ObserveTab
              gameId={game.id}
              defaultInning={game.current_inning}
              homeTeam={game.home_team}
              awayTeam={game.away_team}
            />
          </TabsContent>
          <TabsContent value="pitcher" className="mt-4">
            <PitcherTab
              gameId={game.id}
              defaultInning={game.current_inning}
              defenseTeam={game.home_team}
              homeTeam={game.home_team}
              awayTeam={game.away_team}
            />
          </TabsContent>
          <TabsContent value="myjob" className="mt-4">
            <MyJobTab gameId={game.id} onGoToObserve={() => setTab("observe")} />
          </TabsContent>
          <TabsContent value="steal" className="mt-4">
            <StealItTab
              gameId={game.id}
              defaultInning={game.current_inning}
              opponentId={game.opponent_id}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
