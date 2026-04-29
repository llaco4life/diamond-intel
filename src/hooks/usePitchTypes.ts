import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTeam } from "@/hooks/useActiveTeam";
import { DEFAULT_PITCH_TYPES, type PitchTypeRow } from "@/lib/pitchIntel/types";

/**
 * Pitch types are scoped per team. Each team has its own library so labels
 * (e.g. "Screwball Away" vs "Screwball") can differ between teams.
 */
export function usePitchTypes() {
  const { org } = useAuth();
  const { activeTeamId } = useActiveTeam();
  const [types, setTypes] = useState<PitchTypeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!org || !activeTeamId) {
      setTypes([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("pitch_types")
      .select("*")
      .eq("team_id", activeTeamId)
      .order("sort_order");
    let rows = (data ?? []) as PitchTypeRow[];
    if (rows.length === 0) {
      // Seed defaults for this team
      const seed = DEFAULT_PITCH_TYPES.map((p) => ({
        ...p,
        org_id: org.id,
        team_id: activeTeamId,
      }));
      const { data: inserted } = await supabase.from("pitch_types").insert(seed).select("*");
      rows = (inserted ?? []) as PitchTypeRow[];
    }
    setTypes(rows);
    setLoading(false);
  }, [org, activeTeamId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { types, loading, refresh };
}
