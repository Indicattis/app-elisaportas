CREATE OR REPLACE FUNCTION public.preencher_vaga_com_usuario(
  p_vaga_id uuid,
  p_admin_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cargo text;
  v_status text;
  v_updated int;
BEGIN
  IF NOT (public.is_admin() OR public.can_view_all_admin_users()) THEN
    RAISE EXCEPTION 'Sem permissão para preencher vagas';
  END IF;

  SELECT cargo, status INTO v_cargo, v_status
  FROM public.vagas
  WHERE id = p_vaga_id;

  IF v_cargo IS NULL THEN
    RAISE EXCEPTION 'Vaga não encontrada';
  END IF;

  IF v_status NOT IN ('aberta','em_analise') THEN
    RAISE EXCEPTION 'Vaga não está disponível para preenchimento (status: %)', v_status;
  END IF;

  UPDATE public.admin_users
  SET role = v_cargo,
      visivel_organograma = true
  WHERE id = p_admin_user_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;

  UPDATE public.vagas
  SET status = 'preenchida',
      preenchida_por = p_admin_user_id,
      updated_at = now()
  WHERE id = p_vaga_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.preencher_vaga_com_usuario(uuid, uuid) TO authenticated;