CREATE INDEX IF NOT EXISTS idx_scout_obs_game_inning_created
  ON public.scout_observations (game_id, inning, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pitchers_game ON public.pitchers (game_id);
CREATE INDEX IF NOT EXISTS idx_games_org_status ON public.games (org_id, status);