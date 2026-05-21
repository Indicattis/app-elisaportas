DROP POLICY IF EXISTS "Direcao manage caixa_elisa_config" ON public.caixa_elisa_config;
DROP POLICY IF EXISTS "Direcao manage caixa_elisa_obrigacoes" ON public.caixa_elisa_obrigacoes;

CREATE POLICY "Caixa elisa config access"
ON public.caixa_elisa_config
FOR ALL
USING (public.has_route_access(auth.uid(), 'direcao_caixa_elisa'))
WITH CHECK (public.has_route_access(auth.uid(), 'direcao_caixa_elisa'));

CREATE POLICY "Caixa elisa obrigacoes access"
ON public.caixa_elisa_obrigacoes
FOR ALL
USING (public.has_route_access(auth.uid(), 'direcao_caixa_elisa'))
WITH CHECK (public.has_route_access(auth.uid(), 'direcao_caixa_elisa'));