-- Permitir que líderes (com acesso à gestão de colaboradores) atualizem e deletem admin_users e deletem vagas

DROP POLICY IF EXISTS "Admins update all, users update own (no role escalation)" ON public.admin_users;

CREATE POLICY "Admins/leaders update all, users update own (no role escalation)"
ON public.admin_users
FOR UPDATE
USING (
  is_admin()
  OR can_view_all_admin_users()
  OR (user_id = auth.uid())
)
WITH CHECK (
  is_admin()
  OR can_view_all_admin_users()
  OR (
    (user_id = auth.uid())
    AND (role = (SELECT au.role FROM admin_users au WHERE au.user_id = auth.uid()))
    AND (COALESCE(bypass_permissions, false) = COALESCE((SELECT au.bypass_permissions FROM admin_users au WHERE au.user_id = auth.uid()), false))
  )
);

DROP POLICY IF EXISTS "Only admins can delete admin_users" ON public.admin_users;

CREATE POLICY "Admins and leaders can delete admin_users"
ON public.admin_users
FOR DELETE
USING (is_admin() OR can_view_all_admin_users());

DROP POLICY IF EXISTS "Only admins can create admin_users" ON public.admin_users;

CREATE POLICY "Admins and leaders can create admin_users"
ON public.admin_users
FOR INSERT
WITH CHECK (is_admin() OR can_view_all_admin_users());

DROP POLICY IF EXISTS "Only admins can delete vagas" ON public.vagas;

CREATE POLICY "Admins and leaders can delete vagas"
ON public.vagas
FOR DELETE
USING (is_admin() OR can_view_all_admin_users());