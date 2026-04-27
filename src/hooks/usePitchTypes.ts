import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_PITCH_TYPES, type PitchTypeRow } from "@/lib/pitchIntel/types";

export function usePitchTypes() {
  const { org } = useAuth();
  const [types, setTypes] = useState<PitchTypeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!org) return;
    const { data } = await supabase
      .from("pitch_types")
      .select("*")
      .eq("org_id", org.id)
      .order("sort_order");
    let rows = (data ?? []) as PitchTypeRow[];
    if (rows.length === 0) {
      // Seed defaults
      const seed = DEFAULT_PITCH_TYPES.map((p) => ({ ...p, org_id: org.id }));
      const { data: inserted } = await supabase.from("pitch_types").insert(seed).select("*");
      rows = (inserted ?? []) as PitchTypeRow[];
    }
    setTypes(rows);
    setLoading(false);
  }, [org]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { types, loading, refresh };
}
