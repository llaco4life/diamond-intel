CREATE TABLE public.diamond_decision_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  inning int NOT NULL,
  prompt_key text NOT NULL,
  prompt_text text NOT NULL,
  response text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, player_id, inning, prompt_key)
);

ALTER TABLE public.diamond_decision_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read diamond responses"
ON public.diamond_decision_responses FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND g.org_id = public.get_my_org_id()));

CREATE POLICY "Players write own diamond responses"
ON public.diamond_decision_responses FOR INSERT TO authenticated
WITH CHECK (player_id = auth.uid() AND EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND g.org_id = public.get_my_org_id()));

CREATE POLICY "Players update own diamond responses"
ON public.diamond_decision_responses FOR UPDATE TO authenticated
USING (player_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER diamond_responses_touch_updated_at
BEFORE UPDATE ON public.diamond_decision_responses
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();