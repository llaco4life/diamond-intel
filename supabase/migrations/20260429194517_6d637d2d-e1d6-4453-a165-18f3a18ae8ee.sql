-- Replace partial unique index with a true unique constraint usable by ON CONFLICT
DROP INDEX IF EXISTS public.pitch_code_map_team_code_unique;

-- Remove any orphan rows missing team_id so we can enforce NOT NULL + unique
DELETE FROM public.pitch_code_map WHERE team_id IS NULL;

ALTER TABLE public.pitch_code_map ALTER COLUMN team_id SET NOT NULL;

ALTER TABLE public.pitch_code_map
  ADD CONSTRAINT pitch_code_map_team_code_unique UNIQUE (team_id, numeric_code);