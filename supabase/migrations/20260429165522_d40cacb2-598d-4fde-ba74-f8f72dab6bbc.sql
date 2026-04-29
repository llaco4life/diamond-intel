-- Update handle_new_user to allow account creation without role/org metadata.
-- Onboarding now happens after signup via complete_head_coach_onboarding or
-- the existing /invite/$token redeem flow.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role; v_full_name TEXT; v_org_name TEXT; v_join_code TEXT;
  v_org_id UUID; v_team_id UUID; v_code_attempt TEXT; v_attempts INT := 0;
  v_invited BOOLEAN; v_invite_token TEXT; v_invite public.org_invite_links%ROWTYPE;
  v_role_raw TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User');
  v_invited := COALESCE((NEW.raw_user_meta_data->>'invited')::boolean, false);
  v_invite_token := NEW.raw_user_meta_data->>'invite_token';

  -- Invite-link signup unchanged
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

  v_role_raw := NEW.raw_user_meta_data->>'role';

  -- New 2-step onboarding flow: no role in metadata. Profile/role/team will
  -- be created by the onboarding step (head coach) or by /invite/$token.
  IF v_role_raw IS NULL OR v_role_raw = '' THEN
    RETURN NEW;
  END IF;

  -- Legacy fallback (older clients still sending role + org_name/join_code).
  v_role := v_role_raw::app_role;
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

    INSERT INTO public.teams (org_id, name, created_by)
    VALUES (v_org_id, COALESCE(v_org_name, v_full_name || '''s Team'), NEW.id)
    RETURNING id INTO v_team_id;

    INSERT INTO public.profiles (id, full_name, org_id, active_team_id)
    VALUES (NEW.id, v_full_name, v_org_id, v_team_id);
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
    INSERT INTO public.team_memberships (team_id, user_id, role)
    VALUES (v_team_id, NEW.id, v_role);
  ELSE
    IF v_join_code IS NULL OR v_join_code = '' THEN
      RAISE EXCEPTION 'Team join code is required';
    END IF;
    SELECT id, org_id INTO v_team_id, v_org_id FROM public.teams WHERE join_code = v_join_code;
    IF v_team_id IS NULL THEN
      RAISE EXCEPTION 'Invalid join code: %', v_join_code;
    END IF;

    INSERT INTO public.profiles (id, full_name, org_id, active_team_id)
    VALUES (NEW.id, v_full_name, v_org_id, v_team_id);
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
    INSERT INTO public.team_memberships (team_id, user_id, role)
    VALUES (v_team_id, NEW.id, v_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Onboarding: head coach creates their org + first team in one transaction.
CREATE OR REPLACE FUNCTION public.complete_head_coach_onboarding(
  _team_name TEXT,
  _age_group TEXT
)
RETURNS TABLE(success BOOLEAN, reason TEXT, org_id UUID, team_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_full_name TEXT;
  v_existing_org UUID;
  v_org_id UUID;
  v_team_id UUID;
  v_code TEXT;
  v_attempts INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'not_authenticated'::TEXT, NULL::UUID, NULL::UUID; RETURN;
  END IF;

  IF _team_name IS NULL OR length(trim(_team_name)) = 0 THEN
    RETURN QUERY SELECT FALSE, 'team_name_required'::TEXT, NULL::UUID, NULL::UUID; RETURN;
  END IF;

  SELECT p.org_id INTO v_existing_org FROM public.profiles p WHERE p.id = v_user_id;
  IF v_existing_org IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'already_onboarded'::TEXT, v_existing_org, NULL::UUID; RETURN;
  END IF;

  v_full_name := COALESCE(
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id),
    'New User'
  );

  -- Generate org join_code
  LOOP
    v_code := public.generate_join_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.organizations WHERE join_code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique org code'; END IF;
  END LOOP;

  INSERT INTO public.organizations (name, join_code, created_by)
  VALUES (trim(_team_name), v_code, v_user_id)
  RETURNING id INTO v_org_id;

  -- Team join_code auto-filled by set_team_join_code trigger
  INSERT INTO public.teams (org_id, name, age_group, created_by)
  VALUES (v_org_id, trim(_team_name), NULLIF(trim(COALESCE(_age_group, '')), ''), v_user_id)
  RETURNING id INTO v_team_id;

  INSERT INTO public.profiles (id, full_name, org_id, active_team_id)
  VALUES (v_user_id, v_full_name, v_org_id, v_team_id)
  ON CONFLICT (id) DO UPDATE SET
    org_id = EXCLUDED.org_id,
    active_team_id = EXCLUDED.active_team_id,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'head_coach')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.team_memberships (team_id, user_id, role)
  VALUES (v_team_id, v_user_id, 'head_coach')
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_org_id, v_team_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.complete_head_coach_onboarding(TEXT, TEXT) TO authenticated;