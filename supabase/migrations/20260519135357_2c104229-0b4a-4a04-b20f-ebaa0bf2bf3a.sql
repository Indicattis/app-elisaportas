CREATE OR REPLACE FUNCTION public.remover_colaborador_organograma(
  p_admin_user_id uuid,
  p_justificativa text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_nome text;
  v_vaga_id uuid;
BEGIN
  IF NOT (public.is_admin() OR public.can_view_all_admin_users()) THEN
    RAISE EXCEPTION 'Sem permissão para remover colaboradores do organograma';
  END IF;

  SELECT role, nome INTO v_role, v_nome
  FROM public.admin_users
  WHERE id = p_admin_user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;

  UPDATE public.admin_users
  SET visivel_organograma = false
  WHERE id = p_admin_user_id;

  INSERT INTO public.vagas (cargo, justificativa, created_by, status)
  VALUES (
    v_role,
    COALESCE(p_justificativa, 'Vaga aberta pela remoção de ' || v_nome || ' do organograma'),
    auth.uid(),
    'em_analise'
  )
  RETURNING id INTO v_vaga_id;

  RETURN v_vaga_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remover_colaborador_organograma(uuid, text) TO authenticated;