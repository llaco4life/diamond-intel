-- =========================================
-- Invite Links table
-- =========================================
CREATE TABLE public.org_invite_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  role app_role NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT invite_role_valid CHECK (role IN ('player', 'assistant_coach'))
);

CREATE INDEX idx_org_invite_links_token ON public.org_invite_links(token);
CREATE INDEX idx_org_invite_links_org ON public.org_invite_links(org_id);

ALTER TABLE public.org_invite_links ENABLE ROW LEVEL SECURITY;

-- Head coaches can manage their org's invite links
CREATE POLICY "Head coaches read org invites"
  ON public.org_invite_links
  FOR SELECT
  TO authenticated
  USING (org_id = public.get_my_org_id() AND public.has_role(auth.uid(), 'head_coach'));

CREATE POLICY "Head coaches create org invites"
  ON public.org_invite_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = public.get_my_org_id()
    AND public.has_role(auth.uid(), 'head_coach')
    AND created_by = auth.uid()
  );

CREATE POLICY "Head coaches update org invites"
  ON public.org_invite_links
  FOR UPDATE
  TO authenticated
  USING (org_id = public.get_my_org_id() AND public.has_role(auth.uid(), 'head_coach'));

CREATE POLICY "Head coaches delete org invites"
  ON public.org_invite_links
  FOR DELETE
  TO authenticated
  USING (org_id = public.get_my_org_id() AND public.has_role(auth.uid(), 'head_coach'));

-- updated_at trigger
CREATE TRIGGER touch_org_invite_links
  BEFORE UPDATE ON public.org_invite_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================
-- Public preview function (safe for anon)
-- =========================================
CREATE OR REPLACE FUNCTION public.get_invite_preview(_token TEXT)
RETURNS TABLE (
  org_name TEXT,
  role app_role,
  is_valid BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.org_invite_links%ROWTYPE;
  v_org_name TEXT;
BEGIN
  SELECT * INTO v_invite FROM public.org_invite_links WHERE token = _token;

  IF v_invite.id IS NULL THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::app_role, FALSE, 'not_found'::TEXT;
    RETURN;
  END IF;

  SELECT name INTO v_org_name FROM public.organizations WHERE id = v_invite.org_id;

  IF v_invite.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT v_org_name, v_invite.role, FALSE, 'revoked'::TEXT;
    RETURN;
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN QUERY SELECT v_org_name, v_invite.role, FALSE, 'expired'::TEXT;
    RETURN;
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.uses_count >= v_invite.max_uses THEN
    RETURN QUERY SELECT v_org_name, v_invite.role, FALSE, 'max_uses_reached'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_org_name, v_invite.role, TRUE, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_preview(TEXT) TO anon, authenticated;

-- =========================================
-- Redeem invite (authenticated)
-- =========================================
CREATE OR REPLACE FUNCTION public.redeem_invite(_token TEXT)
RETURNS TABLE (
  success BOOLEAN,
  reason TEXT,
  org_id UUID,
  role app_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invite public.org_invite_links%ROWTYPE;
  v_existing_org UUID;
  v_full_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'not_authenticated'::TEXT, NULL::UUID, NULL::app_role;
    RETURN;
  END IF;

  SELECT * INTO v_invite FROM public.org_invite_links WHERE token = _token FOR UPDATE;

  IF v_invite.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'not_found'::TEXT, NULL::UUID, NULL::app_role;
    RETURN;
  END IF;

  IF v_invite.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'revoked'::TEXT, v_invite.org_id, v_invite.role;
    RETURN;
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN QUERY SELECT FALSE, 'expired'::TEXT, v_invite.org_id, v_invite.role;
    RETURN;
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.uses_count >= v_invite.max_uses THEN
    RETURN QUERY SELECT FALSE, 'max_uses_reached'::TEXT, v_invite.org_id, v_invite.role;
    RETURN;
  END IF;

  -- Check if user already has a profile
  SELECT p.org_id INTO v_existing_org FROM public.profiles p WHERE p.id = v_user_id;

  IF v_existing_org IS NOT NULL AND v_existing_org <> v_invite.org_id THEN
    RETURN QUERY SELECT FALSE, 'already_in_other_org'::TEXT, v_invite.org_id, v_invite.role;
    RETURN;
  END IF;

  -- Create profile if missing (invite-based signup path)
  IF v_existing_org IS NULL THEN
    v_full_name := COALESCE(
      (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id),
      'New User'
    );
    INSERT INTO public.profiles (id, full_name, org_id)
    VALUES (v_user_id, v_full_name, v_invite.org_id)
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id;
  END IF;

  -- Add role if not already present
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_user_id AND role = v_invite.role
  ) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, v_invite.role);
  END IF;

  -- Increment usage
  UPDATE public.org_invite_links
  SET uses_count = uses_count + 1
  WHERE id = v_invite.id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_invite.org_id, v_invite.role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_invite(TEXT) TO authenticated;

-- =========================================
-- Update handle_new_user to support invite signups
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_full_name TEXT;
  v_org_name TEXT;
  v_join_code TEXT;
  v_org_id UUID;
  v_code_attempt TEXT;
  v_attempts INT := 0;
  v_invited BOOLEAN;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User');
  v_invited := COALESCE((NEW.raw_user_meta_data->>'invited')::boolean, false);

  -- If signing up via invite link, defer org/role assignment to redeem_invite
  IF v_invited THEN
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
      IF v_attempts > 10 THEN
        RAISE EXCEPTION 'Could not generate unique join code';
      END IF;
    END LOOP;

    INSERT INTO public.organizations (name, join_code, created_by)
    VALUES (COALESCE(v_org_name, v_full_name || '''s Team'), v_code_attempt, NEW.id)
    RETURNING id INTO v_org_id;
  ELSE
    IF v_join_code IS NULL OR v_join_code = '' THEN
      RAISE EXCEPTION 'Join code is required';
    END IF;
    SELECT id INTO v_org_id FROM public.organizations WHERE join_code = v_join_code;
    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'Invalid join code: %', v_join_code;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, full_name, org_id)
  VALUES (NEW.id, v_full_name, v_org_id);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role);

  RETURN NEW;
END;
$$;