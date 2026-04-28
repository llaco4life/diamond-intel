-- 1. Add team_id to org_invite_links
ALTER TABLE public.org_invite_links ADD COLUMN IF NOT EXISTS team_id uuid NULL;
CREATE INDEX IF NOT EXISTS idx_org_invite_links_team_id ON public.org_invite_links(team_id);

-- 2. Create team_memberships table
CREATE TABLE IF NOT EXISTS public.team_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_team_memberships_team_id ON public.team_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_user_id ON public.team_memberships(user_id);

ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read team_memberships" ON public.team_memberships;
CREATE POLICY "Org members read team_memberships"
ON public.team_memberships FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.teams t
  WHERE t.id = team_memberships.team_id AND t.org_id = public.get_my_org_id()
));

DROP POLICY IF EXISTS "Coaches insert team_memberships" ON public.team_memberships;
CREATE POLICY "Coaches insert team_memberships"
ON public.team_memberships FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_memberships.team_id AND t.org_id = public.get_my_org_id())
  AND (public.has_role(auth.uid(), 'head_coach'::app_role) OR public.has_role(auth.uid(), 'assistant_coach'::app_role))
);

DROP POLICY IF EXISTS "Coaches delete team_memberships" ON public.team_memberships;
CREATE POLICY "Coaches delete team_memberships"
ON public.team_memberships FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_memberships.team_id AND t.org_id = public.get_my_org_id())
  AND (public.has_role(auth.uid(), 'head_coach'::app_role) OR public.has_role(auth.uid(), 'assistant_coach'::app_role))
);

DROP POLICY IF EXISTS "Coaches update team_memberships" ON public.team_memberships;
CREATE POLICY "Coaches update team_memberships"
ON public.team_memberships FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_memberships.team_id AND t.org_id = public.get_my_org_id())
  AND (public.has_role(auth.uid(), 'head_coach'::app_role) OR public.has_role(auth.uid(), 'assistant_coach'::app_role))
);

-- 3. redeem_invite
CREATE OR REPLACE FUNCTION public.redeem_invite(_token text)
 RETURNS TABLE(success boolean, reason text, org_id uuid, role app_role)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_invite public.org_invite_links%ROWTYPE;
  v_existing_org UUID;
  v_full_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'not_authenticated'::TEXT, NULL::UUID, NULL::app_role; RETURN;
  END IF;
  SELECT * INTO v_invite FROM public.org_invite_links WHERE token = _token FOR UPDATE;
  IF v_invite.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'not_found'::TEXT, NULL::UUID, NULL::app_role; RETURN;
  END IF;
  IF v_invite.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'revoked'::TEXT, v_invite.org_id, v_invite.role; RETURN;
  END IF;
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN QUERY SELECT FALSE, 'expired'::TEXT, v_invite.org_id, v_invite.role; RETURN;
  END IF;
  IF v_invite.max_uses IS NOT NULL AND v_invite.uses_count >= v_invite.max_uses THEN
    RETURN QUERY SELECT FALSE, 'max_uses_reached'::TEXT, v_invite.org_id, v_invite.role; RETURN;
  END IF;

  SELECT p.org_id INTO v_existing_org FROM public.profiles p WHERE p.id = v_user_id;
  IF v_existing_org IS NOT NULL AND v_existing_org <> v_invite.org_id THEN
    RETURN QUERY SELECT FALSE, 'already_in_other_org'::TEXT, v_invite.org_id, v_invite.role; RETURN;
  END IF;

  IF v_existing_org IS NULL THEN
    v_full_name := COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id), 'New User');
    INSERT INTO public.profiles (id, full_name, org_id) VALUES (v_user_id, v_full_name, v_invite.org_id)
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = v_invite.role) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, v_invite.role);
  END IF;

  IF v_invite.team_id IS NOT NULL THEN
    INSERT INTO public.team_memberships (team_id, user_id, role)
    VALUES (v_invite.team_id, v_user_id, v_invite.role)
    ON CONFLICT (team_id, user_id, role) DO NOTHING;
    UPDATE public.profiles SET active_team_id = v_invite.team_id WHERE id = v_user_id;
  END IF;

  UPDATE public.org_invite_links SET uses_count = uses_count + 1 WHERE id = v_invite.id;
  RETURN QUERY SELECT TRUE, NULL::TEXT, v_invite.org_id, v_invite.role;
END;
$function$;

-- 4. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role; v_full_name TEXT; v_org_name TEXT; v_join_code TEXT;
  v_org_id UUID; v_code_attempt TEXT; v_attempts INT := 0;
  v_invited BOOLEAN; v_invite_token TEXT; v_invite public.org_invite_links%ROWTYPE;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User');
  v_invited := COALESCE((NEW.raw_user_meta_data->>'invited')::boolean, false);
  v_invite_token := NEW.raw_user_meta_data->>'invite_token';

  IF v_invited AND v_invite_token IS NOT NULL THEN
    SELECT * INTO v_invite FROM public.org_invite_links WHERE token = v_invite_token FOR UPDATE;
    IF v_invite.id IS NOT NULL
       AND v_invite.revoked_at IS NULL
       AND (v_invite.expires_at IS NULL OR v_invite.expires_at > now())
       AND (v_invite.max_uses IS NULL OR v_invite.uses_count < v_invite.max_uses)
    THEN
      INSERT INTO public.profiles (id, full_name, org_id, active_team_id)
      VALUES (NEW.id, v_full_name, v_invite.org_id, v_invite.team_id)
      ON CONFLICT (id) DO UPDATE SET
        org_id = EXCLUDED.org_id,
        active_team_id = COALESCE(EXCLUDED.active_team_id, public.profiles.active_team_id);

      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_invite.role)
      ON CONFLICT DO NOTHING;

      IF v_invite.team_id IS NOT NULL THEN
        INSERT INTO public.team_memberships (team_id, user_id, role)
        VALUES (v_invite.team_id, NEW.id, v_invite.role)
        ON CONFLICT DO NOTHING;
      END IF;

      UPDATE public.org_invite_links SET uses_count = uses_count + 1 WHERE id = v_invite.id;
    END IF;
    RETURN NEW;
  END IF;

  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'player');
  v_org_name := NEW.raw_user_meta_data->>'org_name';
  v_join_code := UPPER(NEW.raw_user_meta_data->>'join_code');

  IF v_role = 'head_coach' THEN
    LOOP
      v_code_attempt := public.generate_join_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.organizations WHERE join_code = v_code_attempt);
      v_attempts := v_attempts + 1;
      IF v_attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique join code'; END IF;
    END LOOP;
    INSERT INTO public.organizations (name, join_code, created_by)
    VALUES (COALESCE(v_org_name, v_full_name || '''s Team'), v_code_attempt, NEW.id)
    RETURNING id INTO v_org_id;
  ELSE
    IF v_join_code IS NULL OR v_join_code = '' THEN RAISE EXCEPTION 'Join code is required'; END IF;
    SELECT id INTO v_org_id FROM public.organizations WHERE join_code = v_join_code;
    IF v_org_id IS NULL THEN RAISE EXCEPTION 'Invalid join code: %', v_join_code; END IF;
  END IF;

  INSERT INTO public.profiles (id, full_name, org_id) VALUES (NEW.id, v_full_name, v_org_id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END;
$function$;

-- 5. get_invite_preview (drop first to change return type)
DROP FUNCTION IF EXISTS public.get_invite_preview(text);
CREATE FUNCTION public.get_invite_preview(_token text)
 RETURNS TABLE(org_name text, team_name text, role app_role, is_valid boolean, reason text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_invite public.org_invite_links%ROWTYPE;
  v_org_name TEXT;
  v_team_name TEXT;
BEGIN
  SELECT * INTO v_invite FROM public.org_invite_links WHERE token = _token;
  IF v_invite.id IS NULL THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, NULL::app_role, FALSE, 'not_found'::TEXT; RETURN;
  END IF;
  SELECT name INTO v_org_name FROM public.organizations WHERE id = v_invite.org_id;
  IF v_invite.team_id IS NOT NULL THEN
    SELECT name INTO v_team_name FROM public.teams WHERE id = v_invite.team_id;
  END IF;
  IF v_invite.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT v_org_name, v_team_name, v_invite.role, FALSE, 'revoked'::TEXT; RETURN;
  END IF;
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN QUERY SELECT v_org_name, v_team_name, v_invite.role, FALSE, 'expired'::TEXT; RETURN;
  END IF;
  IF v_invite.max_uses IS NOT NULL AND v_invite.uses_count >= v_invite.max_uses THEN
    RETURN QUERY SELECT v_org_name, v_team_name, v_invite.role, FALSE, 'max_uses_reached'::TEXT; RETURN;
  END IF;
  RETURN QUERY SELECT v_org_name, v_team_name, v_invite.role, TRUE, NULL::TEXT;
END;
$function$;

-- 6. Backfill team memberships for existing teams (creators as head coach)
INSERT INTO public.team_memberships (team_id, user_id, role)
SELECT t.id, t.created_by, 'head_coach'::app_role
FROM public.teams t
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_memberships m
  WHERE m.team_id = t.id AND m.user_id = t.created_by AND m.role = 'head_coach'
)
ON CONFLICT DO NOTHING;