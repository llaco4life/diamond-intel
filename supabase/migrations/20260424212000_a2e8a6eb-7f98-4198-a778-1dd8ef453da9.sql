-- Repair: assistant coach Jon McLeod signed up via invite but redeem never ran.
-- Create his profile and assign assistant_coach role.
INSERT INTO public.profiles (id, full_name, org_id)
VALUES ('1a44fffb-cd18-47db-b86f-c7989c143e2c', 'Jon mcleod', '173bd613-97fb-4515-ab38-11ba42d707ec')
ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id;

INSERT INTO public.user_roles (user_id, role)
VALUES ('1a44fffb-cd18-47db-b86f-c7989c143e2c', 'assistant_coach')
ON CONFLICT DO NOTHING;

-- Bump invite usage count to reflect the redemption
UPDATE public.org_invite_links
SET uses_count = uses_count + 1
WHERE token = 'xRlswoSC7yPzc-GzdPEbizXe';