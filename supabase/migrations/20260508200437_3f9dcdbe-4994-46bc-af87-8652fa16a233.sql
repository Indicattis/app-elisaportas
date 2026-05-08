
-- 1. configuracoes_vendas: restrict SELECT to admins
DROP POLICY IF EXISTS "Usuários autenticados podem ler configurações" ON public.configuracoes_vendas;
CREATE POLICY "Admins podem ler configuracoes_vendas"
  ON public.configuracoes_vendas FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 2. neo_correcoes: restrict to authenticated users
DROP POLICY IF EXISTS "Allow public read access to neo_correcoes" ON public.neo_correcoes;
DROP POLICY IF EXISTS "Allow public insert access to neo_correcoes" ON public.neo_correcoes;
DROP POLICY IF EXISTS "Allow public update access to neo_correcoes" ON public.neo_correcoes;
DROP POLICY IF EXISTS "Allow public delete access to neo_correcoes" ON public.neo_correcoes;
DROP POLICY IF EXISTS "Public can read neo_correcoes" ON public.neo_correcoes;
DROP POLICY IF EXISTS "Public can insert neo_correcoes" ON public.neo_correcoes;
DROP POLICY IF EXISTS "Public can update neo_correcoes" ON public.neo_correcoes;
DROP POLICY IF EXISTS "Public can delete neo_correcoes" ON public.neo_correcoes;

CREATE POLICY "Authenticated can select neo_correcoes"
  ON public.neo_correcoes FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert neo_correcoes"
  ON public.neo_correcoes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update neo_correcoes"
  ON public.neo_correcoes FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete neo_correcoes"
  ON public.neo_correcoes FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 3. whatsapp_distribuicao: drop permissive anon UPDATE; expose secure increment function
DROP POLICY IF EXISTS "Allow anon update total_cliques" ON public.whatsapp_distribuicao;

CREATE OR REPLACE FUNCTION public.increment_whatsapp_clique(_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.whatsapp_distribuicao
     SET total_cliques = COALESCE(total_cliques, 0) + 1,
         updated_at = now()
   WHERE id = _id;
$$;
REVOKE ALL ON FUNCTION public.increment_whatsapp_clique(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_whatsapp_clique(uuid) TO anon, authenticated;

-- 4. avaliacoes: keep public SELECT but hide email/telefone from anon
REVOKE SELECT (email, telefone) ON public.avaliacoes FROM anon;

-- 5. chamados_suporte: keep public INSERT, restrict SELECT/UPDATE/DELETE to admins
DROP POLICY IF EXISTS "Authenticated users can view chamados_suporte" ON public.chamados_suporte;
DROP POLICY IF EXISTS "Authenticated users can update chamados_suporte" ON public.chamados_suporte;
DROP POLICY IF EXISTS "Authenticated users can delete chamados_suporte" ON public.chamados_suporte;

CREATE POLICY "Admins can view chamados_suporte"
  ON public.chamados_suporte FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "Admins can update chamados_suporte"
  ON public.chamados_suporte FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete chamados_suporte"
  ON public.chamados_suporte FOR DELETE TO authenticated
  USING (public.is_admin());

-- 6. admin_users: lock down SELECT/INSERT/UPDATE; remove from realtime
DROP POLICY IF EXISTS "Authenticated users can view admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Authenticated users can create admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Authenticated users can update admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Authenticated users can delete admin_users" ON public.admin_users;

CREATE POLICY "Users see own admin row, admins see all"
  ON public.admin_users FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Only admins can create admin_users"
  ON public.admin_users FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "Admins update all, users update own (no role escalation)"
  ON public.admin_users FOR UPDATE TO authenticated
  USING (public.is_admin() OR user_id = auth.uid())
  WITH CHECK (
    public.is_admin()
    OR (
      user_id = auth.uid()
      AND role = (SELECT role FROM public.admin_users WHERE user_id = auth.uid())
      AND COALESCE(bypass_permissions, false) = COALESCE((SELECT bypass_permissions FROM public.admin_users WHERE user_id = auth.uid()), false)
    )
  );
CREATE POLICY "Only admins can delete admin_users"
  ON public.admin_users FOR DELETE TO authenticated
  USING (public.is_admin());

-- Remove admin_users from realtime publication to avoid broadcasting salary/CPF
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'admin_users'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_users';
  END IF;
END $$;

-- 7. clientes: remove anon SELECT access
DROP POLICY IF EXISTS "Anon can read active clientes" ON public.clientes;
DROP POLICY IF EXISTS "Public can read active clientes" ON public.clientes;

-- 8. produtos_vendas_backup_pre_split_instalacao: enable RLS, admins only
ALTER TABLE IF EXISTS public.produtos_vendas_backup_pre_split_instalacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins only backup access" ON public.produtos_vendas_backup_pre_split_instalacao;
CREATE POLICY "Admins only backup access"
  ON public.produtos_vendas_backup_pre_split_instalacao FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
