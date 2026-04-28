DROP POLICY IF EXISTS "Users can view game pitch lineups" ON public.pitch_lineups;
DROP POLICY IF EXISTS "Users can create game pitch lineups" ON public.pitch_lineups;
DROP POLICY IF EXISTS "Users can update game pitch lineups" ON public.pitch_lineups;

CREATE POLICY "Org members can view pitch lineups"
ON public.pitch_lineups
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.games g
    WHERE g.id = pitch_lineups.game_id
      AND g.org_id = public.get_my_org_id()
  )
);

CREATE POLICY "Org members can create pitch lineups"
ON public.pitch_lineups
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.games g
    WHERE g.id = pitch_lineups.game_id
      AND g.org_id = public.get_my_org_id()
  )
);

CREATE POLICY "Org members can update pitch lineups"
ON public.pitch_lineups
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.games g
    WHERE g.id = pitch_lineups.game_id
      AND g.org_id = public.get_my_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.games g
    WHERE g.id = pitch_lineups.game_id
      AND g.org_id = public.get_my_org_id()
  )
);