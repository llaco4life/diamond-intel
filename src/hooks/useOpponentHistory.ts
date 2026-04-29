import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PitchEntryRow } from "@/lib/pitchIntel/types";

export interface OpponentHistory {
  loading: boolean;
  historicalEntries: PitchEntryRow[];
  gameDateById: Map<string, string>;
  gameCount: number;
}

const LOOKBACK_DAYS = 120;
const MAX_GAMES = 10;
const MAX_ENTRIES = 500;

/**
 * Fetch prior pitch_entries from past games against the same opponent,
 * scoped to the current org (via RLS) AND the current game's team_id so
 * Unity 12U history doesn't mix with Unity 14U history.
 */
export function useOpponentHistory(
  currentGameId: string | undefined,
  currentTeamId: string | null | undefined,
  batterTeam: string | undefined,
  currentGameDate: string | undefined,
): OpponentHistory {
  const [state, setState] = useState<OpponentHistory>({
    loading: true,
    historicalEntries: [],
    gameDateById: new Map(),
    gameCount: 0,
  });

  useEffect(() => {
    if (!currentGameId || !currentTeamId || !batterTeam) {
      setState({ loading: false, historicalEntries: [], gameDateById: new Map(), gameCount: 0 });
      return;
    }

    let cancelled = false;
    void (async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);
      const cutoffISO = cutoff.toISOString().slice(0, 10);
      const dateCeil = currentGameDate ?? new Date().toISOString().slice(0, 10);
      const teamLike = batterTeam.trim();

      // 1. Find prior games for THIS team vs same opponent text.
      const { data: games } = await supabase
        .from("games")
        .select("id, game_date, home_team, away_team")
        .eq("team_id", currentTeamId)
        .neq("id", currentGameId)
        .gte("game_date", cutoffISO)
        .lte("game_date", dateCeil)
        .or(`home_team.ilike.${teamLike},away_team.ilike.${teamLike}`)
        .order("game_date", { ascending: false })
        .limit(MAX_GAMES);

      if (cancelled) return;
      const list = games ?? [];
      if (list.length === 0) {
        setState({ loading: false, historicalEntries: [], gameDateById: new Map(), gameCount: 0 });
        return;
      }

      const ids = list.map((g) => g.id);
      const dateMap = new Map<string, string>(list.map((g) => [g.id, g.game_date]));

      // 2. Pull pitch_entries for those games where the batter team matches.
      const { data: entries } = await supabase
        .from("pitch_entries")
        .select("*")
        .in("game_id", ids)
        .ilike("batter_team", teamLike)
        .order("created_at", { ascending: false })
        .limit(MAX_ENTRIES);

      if (cancelled) return;
      setState({
        loading: false,
        historicalEntries: (entries ?? []) as PitchEntryRow[],
        gameDateById: dateMap,
        gameCount: list.length,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [currentGameId, currentTeamId, batterTeam, currentGameDate]);

  return state;
}
