-- Backfill all existing players and assistant coaches in the org into Unity 12u team_memberships
-- so they appear on the active team card. Users can later move members between teams.
INSERT INTO public.team_memberships (team_id, user_id, role)
SELECT '30afcd75-e7d1-4ff4-af1f-4169615dd245'::uuid, ur.user_id, ur.role
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE p.org_id = '173bd613-97fb-4515-ab38-11ba42d707ec'
  AND ur.role IN ('player', 'assistant_coach')
  AND NOT EXISTS (
    SELECT 1 FROM public.team_memberships tm
    WHERE tm.team_id = '30afcd75-e7d1-4ff4-af1f-4169615dd245'::uuid
      AND tm.user_id = ur.user_id
      AND tm.role = ur.role
  );

-- Set active_team_id on all org members who don't have one yet, defaulting to Unity 12u
UPDATE public.profiles
SET active_team_id = '30afcd75-e7d1-4ff4-af1f-4169615dd245'::uuid
WHERE org_id = '173bd613-97fb-4515-ab38-11ba42d707ec'
  AND active_team_id IS NULL;