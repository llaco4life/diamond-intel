CREATE POLICY "Org members delete pitchers"
ON public.pitchers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = pitchers.game_id AND g.org_id = public.get_my_org_id()
  )
);

CREATE POLICY "Org members delete pitcher observations"
ON public.scout_observations
FOR DELETE
TO authenticated
USING (
  pitcher_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = scout_observations.game_id AND g.org_id = public.get_my_org_id()
  )
);