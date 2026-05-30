DROP POLICY IF EXISTS "system_setores_admins_insert" ON public.system_setores;
DROP POLICY IF EXISTS "system_setores_admins_update" ON public.system_setores;
DROP POLICY IF EXISTS "system_setores_admins_delete" ON public.system_setores;

CREATE POLICY "system_setores_manage_insert"
  ON public.system_setores FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
      AND COALESCE(ativo, true) = true
      AND role IN ('administrador','diretor')
  ));

CREATE POLICY "system_setores_manage_update"
  ON public.system_setores FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
      AND COALESCE(ativo, true) = true
      AND role IN ('administrador','diretor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
      AND COALESCE(ativo, true) = true
      AND role IN ('administrador','diretor')
  ));

CREATE POLICY "system_setores_manage_delete"
  ON public.system_setores FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
      AND COALESCE(ativo, true) = true
      AND role IN ('administrador','diretor')
  ));