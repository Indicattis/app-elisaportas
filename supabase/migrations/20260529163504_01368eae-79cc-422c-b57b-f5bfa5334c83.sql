DROP POLICY IF EXISTS "Admins manage custos_folha_mensais" ON public.custos_folha_mensais;

CREATE POLICY "Active admin_users manage custos_folha_mensais"
ON public.custos_folha_mensais
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND COALESCE(ativo, true) = true))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND COALESCE(ativo, true) = true));