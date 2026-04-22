ALTER TABLE public.at_bats
  ADD COLUMN batter_number text,
  ADD COLUMN batter_team text CHECK (batter_team IN ('my_team','opponent')),
  ADD COLUMN pitch_counts jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(pitch_counts) = 'object');