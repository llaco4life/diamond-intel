ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS learning_phase text,
  ADD COLUMN IF NOT EXISTS learning_focuses text[];

UPDATE public.games
   SET learning_phase = 'live'
 WHERE game_type = 'learning'
   AND learning_phase IS NULL;