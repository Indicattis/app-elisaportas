DROP POLICY IF EXISTS "Admins/leaders update all, users update own (no role escalation)" ON public.admin_users;

CREATE POLICY "Admins/leaders/users-route update all, users update own"
ON public.admin_users
FOR UPDATE
USING (
  is_admin()
  OR can_view_all_admin_users()
  OR has_route_access(auth.uid(), 'users')
  OR (user_id = auth.uid())
)
WITH CHECK (
  is_admin()
  OR can_view_all_admin_users()
  OR has_route_access(auth.uid(), 'users')
  OR (
    (user_id = auth.uid())
    AND (role = (SELECT au.role FROM admin_users au WHERE au.user_id = auth.uid()))
    AND (COALESCE(bypass_permissions, false) = COALESCE((SELECT au.bypass_permissions FROM admin_users au WHERE au.user_id = auth.uid()), false))
  )
);

DROP POLICY IF EXISTS "Admins and leaders can delete admin_users" ON public.admin_users;

CREATE POLICY "Admins, leaders and users-route can delete admin_users"
ON public.admin_users
FOR DELETE
USING (is_admin() OR can_view_all_admin_users() OR has_route_access(auth.uid(), 'users'));

DROP POLICY IF EXISTS "Admins and leaders can create admin_users" ON public.admin_users;

CREATE POLICY "Admins, leaders and users-route can create admin_users"
ON public.admin_users
FOR INSERT
WITH CHECK (is_admin() OR can_view_all_admin_users() OR has_route_access(auth.uid(), 'users'));