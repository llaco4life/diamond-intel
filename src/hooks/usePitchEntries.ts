import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PitchEntryRow } from "@/lib/pitchIntel/types";

export function usePitchEntries(gameId: string | undefined) {
  const [entries, setEntries] = useState<PitchEntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!gameId) return;
    const { data } = await supabase
      .from("pitch_entries")
      .select("*")
      .eq("game_id", gameId)
      .order("created_at");
    setEntries((data ?? []) as PitchEntryRow[]);
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Realtime
  useEffect(() => {
    if (!gameId) return;
    const ch = supabase
      .channel(`pitch_entries:${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pitch_entries", filter: `game_id=eq.${gameId}` },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [gameId, refresh]);

  return { entries, loading, refresh };
}

export async function fetchEntriesForBatter(batterKey: string, batterTeam: string) {
  const { data } = await supabase
    .from("pitch_entries")
    .select("*")
    .eq("batter_key", batterKey)
    .eq("batter_team", batterTeam)
    .order("created_at");
  return (data ?? []) as PitchEntryRow[];
}

export async function fetchEntriesForTeam(batterTeam: string) {
  const { data } = await supabase
    .from("pitch_entries")
    .select("*")
    .eq("batter_team", batterTeam)
    .order("created_at");
  return (data ?? []) as PitchEntryRow[];
}
