ALTER TABLE public.pitchers
  ADD COLUMN team_side text CHECK (team_side IN ('my_team','opponent'));