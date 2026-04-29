DROP POLICY IF EXISTS "Admins can view all representantes" ON public.representantes;

CREATE POLICY "Users with admin users access can view representantes"
ON public.representantes
FOR SELECT
TO authenticated
USING (
  public.has_route_access(auth.uid(), 'users')
  OR public.can_manage_permissions(auth.uid())
  OR public.is_admin()
);