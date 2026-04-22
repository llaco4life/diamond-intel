CREATE UNIQUE INDEX IF NOT EXISTS games_one_active_scout_per_org
  ON public.games (org_id)
  WHERE status = 'active' AND game_type = 'scout';