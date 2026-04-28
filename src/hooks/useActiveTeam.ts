import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Team {
  id: string;
  org_id: string;
  name: string;
  age_group: string | null;
  season: string | null;
}

const LS_KEY = "diamond.activeTeamId";

export function useActiveTeam() {
  const { user, org, profile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!org) return;
    const { data } = await supabase
      .from("teams")
      .select("id,org_id,name,age_group,season")
      .eq("org_id", org.id)
      .order("created_at", { ascending: true });
    setTeams((data ?? []) as Team[]);
    setLoading(false);
  }, [org]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Initialize active team: profile.active_team_id > localStorage > first team
  useEffect(() => {
    if (loading || !teams) return;
    const fromProfile = (profile as unknown as { active_team_id?: string | null })?.active_team_id ?? null;
    const fromLs = typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null;
    const candidate = fromProfile || fromLs || teams[0]?.id || null;
    const exists = candidate && teams.some((t) => t.id === candidate);
    setActiveTeamIdState(exists ? candidate : teams[0]?.id ?? null);
  }, [loading, teams, profile]);

  const setActiveTeamId = useCallback(
    async (id: string | null) => {
      setActiveTeamIdState(id);
      if (typeof window !== "undefined") {
        if (id) window.localStorage.setItem(LS_KEY, id);
        else window.localStorage.removeItem(LS_KEY);
      }
      if (user) {
        await supabase.from("profiles").update({ active_team_id: id }).eq("id", user.id);
      }
    },
    [user],
  );

  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? null;

  return { teams, activeTeam, activeTeamId, setActiveTeamId, loading, refresh };
}
