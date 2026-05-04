import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GameRow {
  id: string;
  org_id: string;
  opponent_id: string | null;
  game_type: "scout" | "learning" | "pitch";
  tournament_name: string | null;
  game_date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  is_timed: boolean;
  time_limit_minutes: number | null;
  timer_started_at: string | null;
  current_inning: number;
  status: "active" | "ended";
  created_by: string;
  created_at: string;
  learning_phase: string | null;
  learning_focuses: string[] | null;
}

export function useActiveGames(
  orgId: string | null,
  gameType?: "scout" | "learning",
  teamId?: string | null,
) {
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!orgId) {
      setGames([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = supabase
      .from("games")
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "active");
    if (gameType) q = q.eq("game_type", gameType);
    if (teamId) q = q.eq("team_id", teamId);
    const { data } = await q.order("created_at", { ascending: false });
    setGames((data as GameRow[] | null) ?? []);
    setLoading(false);
  }, [orgId, gameType, teamId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`org-games-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `org_id=eq.${orgId}` },
        () => reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, reload]);

  return { games, loading, reload };
}
