DROP POLICY IF EXISTS "Admins manage caixa_elisa_config" ON public.caixa_elisa_config;
DROP POLICY IF EXISTS "Admins manage caixa_elisa_obrigacoes" ON public.caixa_elisa_obrigacoes;

CREATE POLICY "Direcao manage caixa_elisa_config"
ON public.caixa_elisa_config
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.admin_users
  WHERE user_id = auth.uid() AND ativo = true AND role IN ('administrador','diretor')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.admin_users
  WHERE user_id = auth.uid() AND ativo = true AND role IN ('administrador','diretor')
));

CREATE POLICY "Direcao manage caixa_elisa_obrigacoes"
ON public.caixa_elisa_obrigacoes
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.admin_users
  WHERE user_id = auth.uid() AND ativo = true AND role IN ('administrador','diretor')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.admin_users
  WHERE user_id = auth.uid() AND ativo = true AND role IN ('administrador','diretor')
));