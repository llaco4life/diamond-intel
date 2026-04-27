import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PitchCodeMapRow } from "@/lib/pitchIntel/types";

export function usePitchCodeMap(pitcherId: string | undefined) {
  const [rows, setRows] = useState<PitchCodeMapRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!pitcherId) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("pitch_code_map")
      .select("*")
      .eq("pitcher_id", pitcherId)
      .order("numeric_code");
    setRows((data ?? []) as PitchCodeMapRow[]);
    setLoading(false);
  }, [pitcherId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, refresh };
}
