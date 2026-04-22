CREATE POLICY "Creators or head coaches delete games"
ON public.games FOR DELETE TO authenticated
USING (
  org_id = public.get_my_org_id()
  AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'head_coach'))
);