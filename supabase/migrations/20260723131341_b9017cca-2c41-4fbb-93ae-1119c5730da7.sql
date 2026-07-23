CREATE POLICY "Authenticated can view active admin_users basic"
ON public.admin_users
FOR SELECT
TO authenticated
USING (ativo = true);