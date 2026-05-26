
-- Grants Data API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requisicoes_venda TO authenticated;
GRANT ALL ON public.requisicoes_venda TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.representantes TO authenticated;
GRANT ALL ON public.representantes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamentos_app TO authenticated;
GRANT ALL ON public.orcamentos_app TO service_role;

-- Permitir Direção visualizar requisições
DROP POLICY IF EXISTS "Rep ve proprias requisicoes" ON public.requisicoes_venda;
CREATE POLICY "Visualizacao requisicoes venda"
ON public.requisicoes_venda
FOR SELECT
TO authenticated
USING (
  is_admin_user(auth.uid())
  OR has_route_access(auth.uid(), 'direcao_vendas')
  OR (representante_id IN (SELECT id FROM public.representantes WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Admin atualiza requisicao" ON public.requisicoes_venda;
CREATE POLICY "Admin/Direcao atualiza requisicao"
ON public.requisicoes_venda
FOR UPDATE
TO authenticated
USING (is_admin_user(auth.uid()) OR has_route_access(auth.uid(), 'direcao_vendas'))
WITH CHECK (is_admin_user(auth.uid()) OR has_route_access(auth.uid(), 'direcao_vendas'));

-- Permitir Direção visualizar representantes vinculados
CREATE POLICY "Direcao ve representantes"
ON public.representantes
FOR SELECT
TO authenticated
USING (has_route_access(auth.uid(), 'direcao_vendas'));

-- Permitir Direção visualizar orçamentos vinculados a requisições
CREATE POLICY "Direcao ve orcamentos_app"
ON public.orcamentos_app
FOR SELECT
TO authenticated
USING (has_route_access(auth.uid(), 'direcao_vendas'));
