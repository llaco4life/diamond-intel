UPDATE public.games
SET team_id = '30afcd75-e7d1-4ff4-af1f-4169615dd245'
WHERE team_id IS NULL;

UPDATE public.pitch_code_map
SET team_id = '30afcd75-e7d1-4ff4-af1f-4169615dd245'
WHERE team_id IS NULL;