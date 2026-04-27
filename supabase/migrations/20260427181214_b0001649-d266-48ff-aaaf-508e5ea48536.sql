-- Pitch Intel module: per-pitcher pitch code mapping + pitch-by-pitch logging.
-- Reuses existing games + pitchers tables. Adds 'pitch' as a new game_type.

ALTER TYPE public.game_type ADD VALUE IF NOT EXISTS 'pitch';

-- Canonical pitch types per org (seeded from app on first use)
CREATE TABLE IF NOT EXISTS public.pitch_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  code text NOT NULL,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);

ALTER TABLE public.pitch_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read pitch_types"
  ON public.pitch_types FOR SELECT TO authenticated
  USING (org_id = public.get_my_org_id());

CREATE POLICY "Org members insert pitch_types"
  ON public.pitch_types FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_my_org_id());

CREATE POLICY "Org members update pitch_types"
  ON public.pitch_types FOR UPDATE TO authenticated
  USING (org_id = public.get_my_org_id());

CREATE POLICY "Coaches delete pitch_types"
  ON public.pitch_types FOR DELETE TO authenticated
  USING (
    org_id = public.get_my_org_id()
    AND (public.has_role(auth.uid(),'head_coach') OR public.has_role(auth.uid(),'assistant_coach'))
  );

-- Per-pitcher numeric code → pitch_type mapping
CREATE TABLE IF NOT EXISTS public.pitch_code_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  pitcher_id uuid NOT NULL,
  numeric_code text NOT NULL,
  pitch_type_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pitcher_id, numeric_code)
);

CREATE INDEX IF NOT EXISTS idx_pitch_code_map_pitcher ON public.pitch_code_map (pitcher_id);

ALTER TABLE public.pitch_code_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read pitch_code_map"
  ON public.pitch_code_map FOR SELECT TO authenticated
  USING (org_id = public.get_my_org_id());

CREATE POLICY "Org members insert pitch_code_map"
  ON public.pitch_code_map FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_my_org_id());

CREATE POLICY "Org members update pitch_code_map"
  ON public.pitch_code_map FOR UPDATE TO authenticated
  USING (org_id = public.get_my_org_id());

CREATE POLICY "Org members delete pitch_code_map"
  ON public.pitch_code_map FOR DELETE TO authenticated
  USING (org_id = public.get_my_org_id());

-- One row per pitch thrown
CREATE TABLE IF NOT EXISTS public.pitch_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  inning int NOT NULL,
  pitcher_id uuid NOT NULL,
  batter_key text NOT NULL,
  batter_team text NOT NULL,
  batter_number text NOT NULL,
  at_bat_seq int NOT NULL,
  pitch_seq int NOT NULL,
  numeric_code text,
  pitch_type_id uuid,
  result text NOT NULL,
  balls_before int NOT NULL,
  strikes_before int NOT NULL,
  balls_after int NOT NULL,
  strikes_after int NOT NULL,
  spray_zone text,
  contact_quality text,
  ab_result text,
  logged_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pitch_entries_game_batter
  ON public.pitch_entries (game_id, batter_key, at_bat_seq, pitch_seq);
CREATE INDEX IF NOT EXISTS idx_pitch_entries_team_jersey
  ON public.pitch_entries (batter_team, batter_number);
CREATE INDEX IF NOT EXISTS idx_pitch_entries_pitcher_time
  ON public.pitch_entries (pitcher_id, created_at);

ALTER TABLE public.pitch_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read pitch_entries"
  ON public.pitch_entries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.games g WHERE g.id = pitch_entries.game_id AND g.org_id = public.get_my_org_id()
  ));

CREATE POLICY "Org members insert pitch_entries"
  ON public.pitch_entries FOR INSERT TO authenticated
  WITH CHECK (
    logged_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.games g WHERE g.id = pitch_entries.game_id AND g.org_id = public.get_my_org_id()
    )
  );

CREATE POLICY "Coaches update pitch_entries"
  ON public.pitch_entries FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.games g WHERE g.id = pitch_entries.game_id AND g.org_id = public.get_my_org_id())
    AND (public.has_role(auth.uid(),'head_coach') OR public.has_role(auth.uid(),'assistant_coach'))
  );

CREATE POLICY "Coaches delete pitch_entries"
  ON public.pitch_entries FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.games g WHERE g.id = pitch_entries.game_id AND g.org_id = public.get_my_org_id())
    AND (public.has_role(auth.uid(),'head_coach') OR public.has_role(auth.uid(),'assistant_coach'))
  );