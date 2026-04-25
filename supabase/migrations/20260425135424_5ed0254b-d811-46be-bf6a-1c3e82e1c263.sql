-- Backfill the 6 players who signed up via invite but never got a profile/role
INSERT INTO public.profiles (id, full_name, org_id)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)),
       l.org_id
FROM auth.users u
JOIN public.org_invite_links l ON l.token = u.raw_user_meta_data->>'invite_token'
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
  AND COALESCE((u.raw_user_meta_data->>'invited')::boolean, false) = true
  AND l.revoked_at IS NULL
  AND (l.expires_at IS NULL OR l.expires_at > now())
  AND (l.max_uses IS NULL OR l.uses_count < l.max_uses);

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, l.role
FROM auth.users u
JOIN public.org_invite_links l ON l.token = u.raw_user_meta_data->>'invite_token'
LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = l.role
WHERE ur.id IS NULL
  AND COALESCE((u.raw_user_meta_data->>'invited')::boolean, false) = true
  AND l.revoked_at IS NULL;

-- Bump usage counts to reflect the backfilled redemptions
UPDATE public.org_invite_links l
SET uses_count = (
  SELECT COUNT(*) FROM auth.users u
  WHERE u.raw_user_meta_data->>'invite_token' = l.token
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id AND p.org_id = l.org_id)
)
WHERE l.token IN (
  SELECT DISTINCT raw_user_meta_data->>'invite_token' FROM auth.users
  WHERE raw_user_meta_data->>'invite_token' IS NOT NULL
);

-- Harden handle_new_user: when an invited user signs up, redeem the invite
-- atomically inside the trigger so they never land without a profile/role,
-- regardless of whether the client ever calls redeem_invite.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
  v_full_name TEXT;
  v_org_name TEXT;
  v_join_code TEXT;
  v_org_id UUID;
  v_code_attempt TEXT;
  v_attempts INT := 0;
  v_invited BOOLEAN;
  v_invite_token TEXT;
  v_invite public.org_invite_links%ROWTYPE;
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
      INSERT INTO public.profiles (id, full_name, org_id)
      VALUES (NEW.id, v_full_name, v_invite.org_id)
      ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id;

      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, v_invite.role)
      ON CONFLICT DO NOTHING;

      UPDATE public.org_invite_links
      SET uses_count = uses_count + 1
      WHERE id = v_invite.id;
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
$function$;

-- Make sure the trigger exists (it may already, but ensure it's wired)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();