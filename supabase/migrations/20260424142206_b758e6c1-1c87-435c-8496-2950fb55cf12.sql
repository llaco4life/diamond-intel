CREATE TABLE public.pinned_must_know (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL,
  observation_id UUID,
  pin_key TEXT NOT NULL,
  label TEXT NOT NULL,
  detail TEXT,
  pinned_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (game_id, pin_key)
);

CREATE INDEX idx_pinned_must_know_game ON public.pinned_must_know(game_id);

ALTER TABLE public.pinned_must_know ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read pins"
ON public.pinned_must_know
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.games g
  WHERE g.id = pinned_must_know.game_id AND g.org_id = public.get_my_org_id()
));

CREATE POLICY "Coaches insert pins"
ON public.pinned_must_know
FOR INSERT
TO authenticated
WITH CHECK (
  pinned_by = auth.uid()
  AND (public.has_role(auth.uid(), 'head_coach'::app_role) OR public.has_role(auth.uid(), 'assistant_coach'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = pinned_must_know.game_id AND g.org_id = public.get_my_org_id()
  )
);

CREATE POLICY "Coaches delete pins"
ON public.pinned_must_know
FOR DELETE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'head_coach'::app_role) OR public.has_role(auth.uid(), 'assistant_coach'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = pinned_must_know.game_id AND g.org_id = public.get_my_org_id()
  )
);