ALTER TABLE public.pitchers DROP CONSTRAINT IF EXISTS pitchers_team_side_check;
ALTER TABLE public.pitchers ADD CONSTRAINT pitchers_team_side_check
  CHECK (team_side IS NULL OR team_side IN ('my_team', 'opponent', 'home', 'away'));