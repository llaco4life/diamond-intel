-- Helper
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'::app_role
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;

-- Audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins read audit log"
ON public.admin_audit_log FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Allow super admins to manage user_roles (grant/revoke roles, including super_admin)
CREATE POLICY "Super admins insert user_roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins delete user_roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins read all user_roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Seed Omar as super admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('ebda24d6-024f-4c33-8bb4-2fc826fd06b3', 'super_admin'::app_role)
ON CONFLICT DO NOTHING;