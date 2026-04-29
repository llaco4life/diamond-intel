-- Add per-team join code
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;

-- Backfill existing teams with a unique code
DO $$
DECLARE
  t RECORD;
  v_code TEXT;
  v_attempts INT;
BEGIN
  FOR t IN SELECT id FROM public.teams WHERE join_code IS NULL LOOP
    v_attempts := 0;
    LOOP
      v_code := public.generate_join_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.teams WHERE join_code = v_code);
      v_attempts := v_attempts + 1;
      IF v_attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique team code'; END IF;
    END LOOP;
    UPDATE public.teams SET join_code = v_code WHERE id = t.id;
  END LOOP;
END $$;

-- Make join_code required going forward
ALTER TABLE public.teams ALTER COLUMN join_code SET NOT NULL;

-- Auto-generate join_code on insert if not provided
CREATE OR REPLACE FUNCTION public.set_team_join_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_attempts INT := 0;
BEGIN
  IF NEW.join_code IS NULL OR NEW.join_code = '' THEN
    LOOP
      v_code := public.generate_join_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.teams WHERE join_code = v_code);
      v_attempts := v_attempts + 1;
      IF v_attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique team code'; END IF;
    END LOOP;
    NEW.join_code := v_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_team_join_code ON public.teams;
CREATE TRIGGER trg_set_team_join_code
  BEFORE INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.set_team_join_code();

-- Update handle_new_user: head coaches create org + a default team with its own code;
-- non-coaches must provide a TEAM join code (matched against teams.join_code).
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

  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'player');
  v_org_name := NEW.raw_user_meta_data->>'org_name';
  v_join_code := UPPER(NEW.raw_user_meta_data->>'join_code');

  IF v_role = 'head_coach' THEN
    -- Create org with an internal join code (kept for legacy compat / org id)
    LOOP
      v_code_attempt := public.generate_join_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.organizations WHERE join_code = v_code_attempt);
      v_attempts := v_attempts + 1;
      IF v_attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique join code'; END IF;
    END LOOP;
    INSERT INTO public.organizations (name, join_code, created_by)
    VALUES (COALESCE(v_org_name, v_full_name || '''s Team'), v_code_attempt, NEW.id)
    RETURNING id INTO v_org_id;

    -- Create a default team with its own join code (auto via trigger)
    INSERT INTO public.teams (org_id, name, created_by)
    VALUES (v_org_id, COALESCE(v_org_name, v_full_name || '''s Team'), NEW.id)
    RETURNING id INTO v_team_id;

    INSERT INTO public.profiles (id, full_name, org_id, active_team_id)
    VALUES (NEW.id, v_full_name, v_org_id, v_team_id);
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
    INSERT INTO public.team_memberships (team_id, user_id, role)
    VALUES (v_team_id, NEW.id, v_role);
  ELSE
    -- Non-coach signup: join code must match a TEAM
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