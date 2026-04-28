import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PitchCodeMapRow } from "@/lib/pitchIntel/types";

export function usePitchCodeMap(pitcherId: string | undefined, teamId?: string | null) {
  const [rows, setRows] = useState<PitchCodeMapRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!pitcherId) {
      setRows([]);
      setLoading(false);
      return;
    }
    let q = supabase.from("pitch_code_map").select("*").eq("pitcher_id", pitcherId);
    if (teamId) q = q.eq("team_id", teamId);
    const { data } = await q.order("numeric_code");
    setRows((data ?? []) as PitchCodeMapRow[]);
    setLoading(false);
  }, [pitcherId, teamId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, refresh };
}
