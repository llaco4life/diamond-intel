-- Add team_id and make game_id nullable
ALTER TABLE public.pitchers
  ADD COLUMN IF NOT EXISTS team_id uuid;

ALTER TABLE public.pitchers
  ALTER COLUMN game_id DROP NOT NULL;

-- Ensure a pitcher is linked to at least a team or a game
ALTER TABLE public.pitchers
  DROP CONSTRAINT IF EXISTS pitchers_team_or_game_required;

ALTER TABLE public.pitchers
  ADD CONSTRAINT pitchers_team_or_game_required
  CHECK (team_id IS NOT NULL OR game_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS pitchers_team_id_idx ON public.pitchers(team_id);

-- Replace RLS policies to also allow team-scoped access
DROP POLICY IF EXISTS "Org members read pitchers" ON public.pitchers;
DROP POLICY IF EXISTS "Org members write pitchers" ON public.pitchers;
DROP POLICY IF EXISTS "Org members update pitchers" ON public.pitchers;
DROP POLICY IF EXISTS "Org members delete pitchers" ON public.pitchers;

CREATE POLICY "Org members read pitchers"
ON public.pitchers FOR SELECT
TO authenticated
USING (
  (game_id IS NOT NULL AND EXISTS (
     SELECT 1 FROM public.games g
     WHERE g.id = pitchers.game_id AND g.org_id = public.get_my_org_id()
  ))
  OR
  (team_id IS NOT NULL AND EXISTS (
     SELECT 1 FROM public.teams t
     WHERE t.id = pitchers.team_id AND t.org_id = public.get_my_org_id()
  ))
);

CREATE POLICY "Org members write pitchers"
ON public.pitchers FOR INSERT
TO authenticated
WITH CHECK (
  (game_id IS NOT NULL AND EXISTS (
     SELECT 1 FROM public.games g
     WHERE g.id = pitchers.game_id AND g.org_id = public.get_my_org_id()
  ))
  OR
  (team_id IS NOT NULL AND EXISTS (
     SELECT 1 FROM public.teams t
     WHERE t.id = pitchers.team_id AND t.org_id = public.get_my_org_id()
  ))
);

CREATE POLICY "Org members update pitchers"
ON public.pitchers FOR UPDATE
TO authenticated
USING (
  (game_id IS NOT NULL AND EXISTS (
     SELECT 1 FROM public.games g
     WHERE g.id = pitchers.game_id AND g.org_id = public.get_my_org_id()
  ))
  OR
  (team_id IS NOT NULL AND EXISTS (
     SELECT 1 FROM public.teams t
     WHERE t.id = pitchers.team_id AND t.org_id = public.get_my_org_id()
  ))
);

CREATE POLICY "Org members delete pitchers"
ON public.pitchers FOR DELETE
TO authenticated
USING (
  (game_id IS NOT NULL AND EXISTS (
     SELECT 1 FROM public.games g
     WHERE g.id = pitchers.game_id AND g.org_id = public.get_my_org_id()
  ))
  OR
  (team_id IS NOT NULL AND EXISTS (
     SELECT 1 FROM public.teams t
     WHERE t.id = pitchers.team_id AND t.org_id = public.get_my_org_id()
  ))
);