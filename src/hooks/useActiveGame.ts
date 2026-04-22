import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GameRow {
  id: string;
  org_id: string;
  opponent_id: string | null;
  game_type: "scout" | "learning";
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
}

export function useActiveGame(orgId: string | null) {
  const [game, setGame] = useState<GameRow | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!orgId) {
      setGame(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("games")
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setGame((data as GameRow | null) ?? null);
    setLoading(false);
  }, [orgId]);

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

  return { game, loading, reload };
}
