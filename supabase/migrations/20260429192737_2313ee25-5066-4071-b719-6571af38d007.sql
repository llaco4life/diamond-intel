-- 1. Backfill team_id on existing pitch_code_map rows from the pitcher's most recent game's team
UPDATE public.pitch_code_map pcm
SET team_id = sub.team_id
FROM (
  SELECT DISTINCT ON (p.id) p.id AS pitcher_id, g.team_id
  FROM public.pitchers p
  JOIN public.games g ON g.id = p.game_id
  WHERE g.team_id IS NOT NULL
  ORDER BY p.id, g.game_date DESC NULLS LAST
) sub
WHERE pcm.pitcher_id = sub.pitcher_id
  AND pcm.team_id IS NULL;

-- Also handle pitchers that already have team_id stamped directly (roster pitchers)
UPDATE public.pitch_code_map pcm
SET team_id = p.team_id
FROM public.pitchers p
WHERE pcm.pitcher_id = p.id
  AND pcm.team_id IS NULL
  AND p.team_id IS NOT NULL;

-- 2. De-duplicate (team_id, numeric_code) — keep most recently created row per team+code
DELETE FROM public.pitch_code_map a
USING public.pitch_code_map b
WHERE a.team_id IS NOT NULL
  AND a.team_id = b.team_id
  AND a.numeric_code = b.numeric_code
  AND a.created_at < b.created_at
  AND a.id <> b.id;

-- 3. Schema changes: pitcher_id becomes optional, team_id+numeric_code is the new unique key
ALTER TABLE public.pitch_code_map
  ALTER COLUMN pitcher_id DROP NOT NULL;

-- Drop the old (pitcher_id, numeric_code) unique index/constraint if present
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.pitch_code_map'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.pitch_code_map DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.pitch_code_map_pitcher_id_numeric_code_key;

-- New uniqueness for the team-wide model
CREATE UNIQUE INDEX IF NOT EXISTS pitch_code_map_team_code_unique
  ON public.pitch_code_map(team_id, numeric_code)
  WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pitch_code_map_team_id_idx
  ON public.pitch_code_map(team_id);