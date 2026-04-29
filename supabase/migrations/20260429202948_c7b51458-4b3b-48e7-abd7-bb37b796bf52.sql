-- 0. Drop the existing org-wide unique constraint on (org_id, code)
ALTER TABLE public.pitch_types DROP CONSTRAINT IF EXISTS pitch_types_org_id_code_key;

-- 1. Add team_id
ALTER TABLE public.pitch_types ADD COLUMN IF NOT EXISTS team_id UUID;

-- 2. Backfill existing rows to Unity 12u
UPDATE public.pitch_types
SET team_id = '30afcd75-e7d1-4ff4-af1f-4169615dd245'
WHERE team_id IS NULL;

-- 3. Duplicate 12u types for 14u and remap dependent rows
DO $$
DECLARE
  src_team UUID := '30afcd75-e7d1-4ff4-af1f-4169615dd245';
  dst_team UUID := 'ee18ce20-4849-4f60-9015-ebaa3138e131';
  v_org UUID := '173bd613-97fb-4515-ab38-11ba42d707ec';
  rec RECORD;
  new_id UUID;
BEGIN
  FOR rec IN SELECT * FROM public.pitch_types WHERE team_id = src_team LOOP
    INSERT INTO public.pitch_types (org_id, team_id, code, label, sort_order)
    VALUES (v_org, dst_team, rec.code, rec.label, rec.sort_order)
    RETURNING id INTO new_id;

    UPDATE public.pitch_code_map
    SET pitch_type_id = new_id
    WHERE team_id = dst_team AND pitch_type_id = rec.id;

    UPDATE public.pitch_entries pe
    SET pitch_type_id = new_id
    WHERE pe.pitch_type_id = rec.id
      AND EXISTS (
        SELECT 1 FROM public.games g
        WHERE g.id = pe.game_id AND g.team_id = dst_team
      );
  END LOOP;
END $$;

-- 4. Require team_id and add per-team unique constraint
ALTER TABLE public.pitch_types ALTER COLUMN team_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pitch_types_team_code_unique ON public.pitch_types (team_id, code);

-- 5. RLS scoped by team
DROP POLICY IF EXISTS "Org members read pitch_types" ON public.pitch_types;
DROP POLICY IF EXISTS "Org members insert pitch_types" ON public.pitch_types;
DROP POLICY IF EXISTS "Org members update pitch_types" ON public.pitch_types;
DROP POLICY IF EXISTS "Coaches delete pitch_types" ON public.pitch_types;

CREATE POLICY "Org members read pitch_types"
ON public.pitch_types FOR SELECT TO authenticated
USING (
  org_id = get_my_org_id()
  AND EXISTS (SELECT 1 FROM public.teams t WHERE t.id = pitch_types.team_id AND t.org_id = get_my_org_id())
);

CREATE POLICY "Org members insert pitch_types"
ON public.pitch_types FOR INSERT TO authenticated
WITH CHECK (
  org_id = get_my_org_id()
  AND EXISTS (SELECT 1 FROM public.teams t WHERE t.id = pitch_types.team_id AND t.org_id = get_my_org_id())
);

CREATE POLICY "Org members update pitch_types"
ON public.pitch_types FOR UPDATE TO authenticated
USING (org_id = get_my_org_id());

CREATE POLICY "Coaches delete pitch_types"
ON public.pitch_types FOR DELETE TO authenticated
USING (
  org_id = get_my_org_id()
  AND (has_role(auth.uid(), 'head_coach'::app_role) OR has_role(auth.uid(), 'assistant_coach'::app_role))
);