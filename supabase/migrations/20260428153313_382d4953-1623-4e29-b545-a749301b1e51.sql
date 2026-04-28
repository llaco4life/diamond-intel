
-- Teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  age_group TEXT,
  season TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read teams"
  ON public.teams FOR SELECT TO authenticated
  USING (org_id = public.get_my_org_id());

CREATE POLICY "Coaches insert teams"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.get_my_org_id()
    AND created_by = auth.uid()
    AND (public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach'))
  );

CREATE POLICY "Coaches update teams"
  ON public.teams FOR UPDATE TO authenticated
  USING (
    org_id = public.get_my_org_id()
    AND (public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach'))
  );

CREATE POLICY "Coaches delete teams"
  ON public.teams FOR DELETE TO authenticated
  USING (
    org_id = public.get_my_org_id()
    AND (public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach'))
  );

CREATE TRIGGER teams_touch_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Team roster
CREATE TABLE public.team_roster (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  jersey_number TEXT NOT NULL,
  name TEXT,
  position TEXT,
  bat_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_roster_team ON public.team_roster(team_id);

ALTER TABLE public.team_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read team_roster"
  ON public.team_roster FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_roster.team_id AND t.org_id = public.get_my_org_id()));

CREATE POLICY "Coaches insert team_roster"
  ON public.team_roster FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_roster.team_id AND t.org_id = public.get_my_org_id())
    AND (public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach'))
  );

CREATE POLICY "Coaches update team_roster"
  ON public.team_roster FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_roster.team_id AND t.org_id = public.get_my_org_id())
    AND (public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach'))
  );

CREATE POLICY "Coaches delete team_roster"
  ON public.team_roster FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_roster.team_id AND t.org_id = public.get_my_org_id())
    AND (public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach'))
  );

CREATE TRIGGER team_roster_touch_updated_at
  BEFORE UPDATE ON public.team_roster
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Add team_id to games
ALTER TABLE public.games ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
CREATE INDEX idx_games_team ON public.games(team_id);

-- Add team_id to pitch_code_map
ALTER TABLE public.pitch_code_map ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
CREATE INDEX idx_pitch_code_map_team ON public.pitch_code_map(team_id);

-- Add active_team_id to profiles
ALTER TABLE public.profiles ADD COLUMN active_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
