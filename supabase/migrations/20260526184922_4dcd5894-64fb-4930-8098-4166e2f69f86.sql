DELETE FROM public.representantes r
USING public.admin_users a
WHERE a.user_id = r.user_id;