CREATE POLICY "Admins can view all representantes"
ON public.representantes
FOR SELECT
TO authenticated
USING (public.is_admin());