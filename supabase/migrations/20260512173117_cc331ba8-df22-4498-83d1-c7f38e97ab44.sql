DROP POLICY IF EXISTS "Lideranca pode ler configuracoes_vendas" ON public.configuracoes_vendas;
DROP POLICY IF EXISTS "Lideranca pode atualizar configuracoes_vendas" ON public.configuracoes_vendas;
DROP POLICY IF EXISTS "Lideranca pode inserir configuracoes_vendas" ON public.configuracoes_vendas;

CREATE POLICY "Acesso por rota direcao_regras_vendas - select"
ON public.configuracoes_vendas
FOR SELECT
TO authenticated
USING (
  public.has_route_access(auth.uid(), 'direcao_regras_vendas')
  OR EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
      AND admin_users.ativo = true
      AND (
        admin_users.role = ANY (ARRAY['admin','administrador','diretor','ceo'])
        OR admin_users.bypass_permissions = true
      )
  )
);

CREATE POLICY "Acesso por rota direcao_regras_vendas - update"
ON public.configuracoes_vendas
FOR UPDATE
TO authenticated
USING (
  public.has_route_access(auth.uid(), 'direcao_regras_vendas')
  OR EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
      AND admin_users.ativo = true
      AND (
        admin_users.role = ANY (ARRAY['admin','administrador','diretor','ceo'])
        OR admin_users.bypass_permissions = true
      )
  )
)
WITH CHECK (
  public.has_route_access(auth.uid(), 'direcao_regras_vendas')
  OR EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
      AND admin_users.ativo = true
      AND (
        admin_users.role = ANY (ARRAY['admin','administrador','diretor','ceo'])
        OR admin_users.bypass_permissions = true
      )
  )
);

CREATE POLICY "Acesso por rota direcao_regras_vendas - insert"
ON public.configuracoes_vendas
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_route_access(auth.uid(), 'direcao_regras_vendas')
  OR EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
      AND admin_users.ativo = true
      AND (
        admin_users.role = ANY (ARRAY['admin','administrador','diretor','ceo'])
        OR admin_users.bypass_permissions = true
      )
  )
);