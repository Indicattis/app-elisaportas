CREATE POLICY "Financeiro route can view all admin_users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (
  has_route_access(auth.uid(), 'admin_financeiro'::text)
  OR has_route_access(auth.uid(), 'administrativo_hub'::text)
);