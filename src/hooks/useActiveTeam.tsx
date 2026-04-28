import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Team {
  id: string;
  org_id: string;
  name: string;
  age_group: string | null;
  season: string | null;
  logo_url: string | null;
}

interface ActiveTeamCtx {
  teams: Team[];
  activeTeam: Team | null;
  activeTeamId: string | null;
  setActiveTeamId: (id: string | null) => Promise<void>;
  loading: boolean;
  refresh: () => Promise<void>;
}

const LS_KEY = "diamond.activeTeamId";
const Ctx = createContext<ActiveTeamCtx | null>(null);

export function ActiveTeamProvider({ children }: { children: ReactNode }) {
  const { user, org, profile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const refresh = useCallback(async () => {
    if (!org) {
      setTeams([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("teams")
      .select("id,org_id,name,age_group,season,logo_url")
      .eq("org_id", org.id)
      .order("created_at", { ascending: true });
    setTeams((data ?? []) as Team[]);
    setLoading(false);
  }, [org]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Initialize active team ONCE after teams load. Never re-runs to overwrite user clicks.
  useEffect(() => {
    if (initialized.current) return;
    if (loading) return;
    if (teams.length === 0) {
      initialized.current = true;
      setActiveTeamIdState(null);
      return;
    }
    const fromProfile = (profile as unknown as { active_team_id?: string | null })?.active_team_id ?? null;
    const fromLs = typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null;
    const candidate = fromProfile || fromLs || teams[0]?.id || null;
    const exists = candidate && teams.some((t) => t.id === candidate);
    setActiveTeamIdState(exists ? candidate : teams[0]?.id ?? null);
    initialized.current = true;
  }, [loading, teams, profile]);

  // If active team disappears (deleted), fall back to first team.
  useEffect(() => {
    if (!initialized.current) return;
    if (activeTeamId && !teams.some((t) => t.id === activeTeamId)) {
      setActiveTeamIdState(teams[0]?.id ?? null);
    }
  }, [teams, activeTeamId]);

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

  return (
    <Ctx.Provider value={{ teams, activeTeam, activeTeamId, setActiveTeamId, loading, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useActiveTeam() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe fallback so a stray usage outside the provider doesn't crash the page.
    return {
      teams: [] as Team[],
      activeTeam: null,
      activeTeamId: null,
      setActiveTeamId: async () => {},
      loading: false,
      refresh: async () => {},
    } satisfies ActiveTeamCtx;
  }
  return ctx;
}
