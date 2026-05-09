ALTER TABLE public.teams ADD COLUMN pitch_entry_mode text NOT NULL DEFAULT 'numeric_codes' CHECK (pitch_entry_mode IN ('numeric_codes','tap_buttons','both'));

ALTER TABLE public.pitch_entries ADD COLUMN pitch_location smallint CHECK (pitch_location BETWEEN 1 AND 9);
ALTER TABLE public.pitch_entries ADD COLUMN batter_hand text CHECK (batter_hand IN ('R','L','S'));