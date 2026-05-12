DROP POLICY IF EXISTS "Admins podem ler configuracoes_vendas" ON public.configuracoes_vendas;
DROP POLICY IF EXISTS "Admins e diretores podem atualizar configurações" ON public.configuracoes_vendas;
DROP POLICY IF EXISTS "Admins e diretores podem inserir configurações" ON public.configuracoes_vendas;

CREATE POLICY "Lideranca pode ler configuracoes_vendas"
ON public.configuracoes_vendas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
      AND admin_users.ativo = true
      AND (
        admin_users.role = ANY (ARRAY['admin','administrador','diretor','ceo'])
        OR admin_users.bypass_permissions = true
      )
  )
);

CREATE POLICY "Lideranca pode atualizar configuracoes_vendas"
ON public.configuracoes_vendas
FOR UPDATE
TO authenticated
USING (
  EXISTS (
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
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
      AND admin_users.ativo = true
      AND (
        admin_users.role = ANY (ARRAY['admin','administrador','diretor','ceo'])
        OR admin_users.bypass_permissions = true
      )
  )
);

CREATE POLICY "Lideranca pode inserir configuracoes_vendas"
ON public.configuracoes_vendas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
      AND admin_users.ativo = true
      AND (
        admin_users.role = ANY (ARRAY['admin','administrador','diretor','ceo'])
        OR admin_users.bypass_permissions = true
      )
  )
);