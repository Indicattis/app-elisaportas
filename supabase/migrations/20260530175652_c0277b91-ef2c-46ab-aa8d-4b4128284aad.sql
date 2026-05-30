DROP POLICY IF EXISTS "Admins can manage empresas_emissoras" ON public.empresas_emissoras;

CREATE POLICY "Users with company admin access can manage empresas_emissoras"
ON public.empresas_emissoras
FOR ALL
TO authenticated
USING (public.has_route_access(auth.uid(), 'admin_companies'))
WITH CHECK (public.has_route_access(auth.uid(), 'admin_companies'));