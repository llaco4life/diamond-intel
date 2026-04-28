CREATE TABLE IF NOT EXISTS public.pitch_lineups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  team TEXT NOT NULL,
  lineup JSONB NOT NULL DEFAULT '[]'::jsonb,
  finalized BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (game_id, team)
);

ALTER TABLE public.pitch_lineups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view game pitch lineups"
ON public.pitch_lineups
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.games g
    WHERE g.id = pitch_lineups.game_id
  )
);

CREATE POLICY "Users can create game pitch lineups"
ON public.pitch_lineups
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.games g
    WHERE g.id = pitch_lineups.game_id
  )
);

CREATE POLICY "Users can update game pitch lineups"
ON public.pitch_lineups
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.games g
    WHERE g.id = pitch_lineups.game_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.games g
    WHERE g.id = pitch_lineups.game_id
  )
);

CREATE INDEX IF NOT EXISTS idx_pitch_lineups_game_team ON public.pitch_lineups (game_id, team);

CREATE OR REPLACE FUNCTION public.update_pitch_lineups_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_pitch_lineups_updated_at ON public.pitch_lineups;
CREATE TRIGGER update_pitch_lineups_updated_at
BEFORE UPDATE ON public.pitch_lineups
FOR EACH ROW
EXECUTE FUNCTION public.update_pitch_lineups_updated_at();