
-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('head_coach', 'assistant_coach', 'player');
CREATE TYPE public.game_type AS ENUM ('scout', 'learning');
CREATE TYPE public.game_status AS ENUM ('active', 'ended');
CREATE TYPE public.dev_status AS ENUM ('working_on', 'got_it');

-- =========================================
-- ORGANIZATIONS
-- =========================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  jersey_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- USER ROLES (separate table for security)
-- =========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- =========================================
-- HELPER FUNCTIONS (SECURITY DEFINER, prevent RLS recursion)
-- =========================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- =========================================
-- SIGNUP TRIGGER: creates profile + role + org (if head_coach)
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User');
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'player');
  v_org_name := NEW.raw_user_meta_data->>'org_name';
  v_join_code := UPPER(NEW.raw_user_meta_data->>'join_code');

  IF v_role = 'head_coach' THEN
    -- generate unique join code
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
    -- look up org by join code
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

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- DOMAIN TABLES
-- =========================================
CREATE TABLE public.opponents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES public.opponents(id) ON DELETE SET NULL,
  game_type game_type NOT NULL,
  tournament_name TEXT,
  game_date DATE NOT NULL DEFAULT CURRENT_DATE,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score INT NOT NULL DEFAULT 0,
  away_score INT NOT NULL DEFAULT 0,
  is_timed BOOLEAN NOT NULL DEFAULT false,
  time_limit_minutes INT,
  timer_started_at TIMESTAMPTZ,
  current_inning INT NOT NULL DEFAULT 1,
  status game_status NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.game_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, player_id)
);

CREATE TABLE public.pitchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  jersey_number TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.scout_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inning INT NOT NULL,
  pitcher_id UUID REFERENCES public.pitchers(id) ON DELETE SET NULL,
  jersey_number TEXT,
  is_team_level BOOLEAN NOT NULL DEFAULT true,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  key_play TEXT,
  steal_it TEXT,
  synced BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.at_bats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inning INT NOT NULL,
  confidence_level INT NOT NULL CHECK (confidence_level BETWEEN 1 AND 5),
  execution INT NOT NULL CHECK (execution BETWEEN 1 AND 5),
  mental_focus INT NOT NULL CHECK (mental_focus BETWEEN 1 AND 5),
  pitches_seen TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.development_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  source_note TEXT NOT NULL,
  status dev_status NOT NULL DEFAULT 'working_on',
  player_notes TEXT,
  coach_notes TEXT,
  drill_assigned TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.scouting_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_plan_notes TEXT,
  exported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- ENABLE RLS
-- =========================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opponents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.at_bats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.development_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_reports ENABLE ROW LEVEL SECURITY;

-- =========================================
-- RLS POLICIES
-- =========================================

-- ORGANIZATIONS: members read; head_coach can update
CREATE POLICY "Org members can read their org" ON public.organizations
FOR SELECT TO authenticated USING (id = public.get_my_org_id());

CREATE POLICY "Head coach can update their org" ON public.organizations
FOR UPDATE TO authenticated
USING (id = public.get_my_org_id() AND public.has_role(auth.uid(), 'head_coach'));

-- Allow signup-time org lookup by join code (public select on join_code only via RPC),
-- but we also need head coach trigger to insert; trigger uses SECURITY DEFINER so RLS not enforced.
-- Provide a permissive lookup-by-join-code policy is unnecessary because lookup happens server-side in trigger.

-- PROFILES
CREATE POLICY "Users read own profile" ON public.profiles
FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Org members read each other" ON public.profiles
FOR SELECT TO authenticated USING (org_id = public.get_my_org_id());

CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (id = auth.uid());

-- USER_ROLES
CREATE POLICY "Users read own roles" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Org members read each other roles" ON public.user_roles
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = user_roles.user_id AND p.org_id = public.get_my_org_id()
));

-- OPPONENTS
CREATE POLICY "Org members read opponents" ON public.opponents
FOR SELECT TO authenticated USING (org_id = public.get_my_org_id());
CREATE POLICY "Org members write opponents" ON public.opponents
FOR INSERT TO authenticated WITH CHECK (org_id = public.get_my_org_id());
CREATE POLICY "Org members update opponents" ON public.opponents
FOR UPDATE TO authenticated USING (org_id = public.get_my_org_id());

-- GAMES
CREATE POLICY "Org members read games" ON public.games
FOR SELECT TO authenticated USING (org_id = public.get_my_org_id());
CREATE POLICY "Org members create games" ON public.games
FOR INSERT TO authenticated WITH CHECK (org_id = public.get_my_org_id() AND created_by = auth.uid());
CREATE POLICY "Org members update games" ON public.games
FOR UPDATE TO authenticated USING (org_id = public.get_my_org_id());

-- GAME_ASSIGNMENTS
CREATE POLICY "Org members read assignments" ON public.game_assignments
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_assignments.game_id AND g.org_id = public.get_my_org_id()));
CREATE POLICY "Players write own assignments" ON public.game_assignments
FOR INSERT TO authenticated
WITH CHECK (player_id = auth.uid() AND EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND g.org_id = public.get_my_org_id()));
CREATE POLICY "Players update own assignments" ON public.game_assignments
FOR UPDATE TO authenticated USING (player_id = auth.uid());

-- PITCHERS
CREATE POLICY "Org members read pitchers" ON public.pitchers
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.games g WHERE g.id = pitchers.game_id AND g.org_id = public.get_my_org_id()));
CREATE POLICY "Org members write pitchers" ON public.pitchers
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.games g WHERE g.id = pitchers.game_id AND g.org_id = public.get_my_org_id()));
CREATE POLICY "Org members update pitchers" ON public.pitchers
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.games g WHERE g.id = pitchers.game_id AND g.org_id = public.get_my_org_id()));

-- SCOUT_OBSERVATIONS
CREATE POLICY "Org members read observations" ON public.scout_observations
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.games g WHERE g.id = scout_observations.game_id AND g.org_id = public.get_my_org_id()));
CREATE POLICY "Players write own observations" ON public.scout_observations
FOR INSERT TO authenticated
WITH CHECK (player_id = auth.uid() AND EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND g.org_id = public.get_my_org_id()));
CREATE POLICY "Players update own observations" ON public.scout_observations
FOR UPDATE TO authenticated USING (player_id = auth.uid());

-- AT_BATS
CREATE POLICY "Org members read at_bats" ON public.at_bats
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.games g WHERE g.id = at_bats.game_id AND g.org_id = public.get_my_org_id()));
CREATE POLICY "Players write own at_bats" ON public.at_bats
FOR INSERT TO authenticated
WITH CHECK (player_id = auth.uid() AND EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND g.org_id = public.get_my_org_id()));
CREATE POLICY "Players update own at_bats" ON public.at_bats
FOR UPDATE TO authenticated USING (player_id = auth.uid());

-- DEVELOPMENT_ITEMS
CREATE POLICY "Org members read dev items" ON public.development_items
FOR SELECT TO authenticated USING (org_id = public.get_my_org_id());
CREATE POLICY "Players write own dev items" ON public.development_items
FOR INSERT TO authenticated
WITH CHECK (org_id = public.get_my_org_id() AND (player_id = auth.uid() OR public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach')));
CREATE POLICY "Players update own dev items" ON public.development_items
FOR UPDATE TO authenticated
USING (org_id = public.get_my_org_id() AND (player_id = auth.uid() OR public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach')));

-- SCOUTING_REPORTS
CREATE POLICY "Coaches read reports" ON public.scouting_reports
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.games g WHERE g.id = scouting_reports.game_id AND g.org_id = public.get_my_org_id())
       AND (public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach')));
CREATE POLICY "Coaches write reports" ON public.scouting_reports
FOR INSERT TO authenticated
WITH CHECK (coach_id = auth.uid() AND (public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach')));
CREATE POLICY "Coaches update reports" ON public.scouting_reports
FOR UPDATE TO authenticated
USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'head_coach'));
