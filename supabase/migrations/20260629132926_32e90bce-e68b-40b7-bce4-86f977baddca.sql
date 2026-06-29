DROP POLICY IF EXISTS "Admins can update representantes" ON public.representantes;
CREATE POLICY "Parceiros page can toggle representantes"
ON public.representantes FOR UPDATE
TO authenticated
USING (has_route_access(auth.uid(), 'direcao_vendas_parceiros') OR has_route_access(auth.uid(), 'direcao_vendas') OR can_manage_permissions(auth.uid()) OR is_admin())
WITH CHECK (has_route_access(auth.uid(), 'direcao_vendas_parceiros') OR has_route_access(auth.uid(), 'direcao_vendas') OR can_manage_permissions(auth.uid()) OR is_admin());