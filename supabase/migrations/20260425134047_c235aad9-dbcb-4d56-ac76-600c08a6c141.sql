-- Repair Jiamei Kemp's invited player account.
-- She signed up via invite token 79zAjyusw8kUmb26Hj-WI4Fb but redeem_invite never ran,
-- leaving her with no profile, no role, and no org membership.

INSERT INTO public.profiles (id, full_name, org_id)
VALUES (
  'd3e0e247-0f47-4911-a11a-a77990587d07',
  'Jiamei',
  '173bd613-97fb-4515-ab38-11ba42d707ec'
)
ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id;

INSERT INTO public.user_roles (user_id, role)
VALUES ('d3e0e247-0f47-4911-a11a-a77990587d07', 'player')
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.org_invite_links
SET uses_count = uses_count + 1
WHERE token = '79zAjyusw8kUmb26Hj-WI4Fb';
