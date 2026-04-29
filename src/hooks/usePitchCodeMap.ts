import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PitchCodeMapRow } from "@/lib/pitchIntel/types";

/**
 * Team-wide pitch codes. Codes are shared by every pitcher on a team.
 */
export function usePitchCodeMap(teamId: string | null | undefined) {
  const [rows, setRows] = useState<PitchCodeMapRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!teamId) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("pitch_code_map")
      .select("*")
      .eq("team_id", teamId)
      .order("numeric_code");
    setRows((data ?? []) as PitchCodeMapRow[]);
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, refresh };
}
