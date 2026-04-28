-- Add logo_url column to teams
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS logo_url text;

-- Create public storage bucket for team logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-logos', 'team-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone in org can read (bucket is public anyway), coaches can write/delete
CREATE POLICY "Public read team logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-logos');

CREATE POLICY "Coaches upload team logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-logos'
  AND (public.has_role(auth.uid(), 'head_coach'::app_role) OR public.has_role(auth.uid(), 'assistant_coach'::app_role))
);

CREATE POLICY "Coaches update team logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'team-logos'
  AND (public.has_role(auth.uid(), 'head_coach'::app_role) OR public.has_role(auth.uid(), 'assistant_coach'::app_role))
);

CREATE POLICY "Coaches delete team logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-logos'
  AND (public.has_role(auth.uid(), 'head_coach'::app_role) OR public.has_role(auth.uid(), 'assistant_coach'::app_role))
);