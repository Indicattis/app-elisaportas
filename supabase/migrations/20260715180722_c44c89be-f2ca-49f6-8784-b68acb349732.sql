CREATE OR REPLACE FUNCTION public.get_autorizador_vendas(p_tipo text)
RETURNS TABLE(user_id uuid, nome text, role text, ativo boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF p_tipo = 'master' THEN
    RETURN QUERY
      SELECT au.user_id, au.nome, au.role, au.ativo
      FROM public.configuracoes_vendas cv
      JOIN public.admin_users au ON au.user_id = cv.responsavel_senha_master_id
      LIMIT 1;
  ELSIF p_tipo = 'responsavel' THEN
    RETURN QUERY
      SELECT au.user_id, au.nome, au.role, au.ativo
      FROM public.configuracoes_vendas cv
      JOIN public.admin_users au ON au.user_id = cv.responsavel_senha_responsavel_id
      LIMIT 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_autorizador_vendas(text) TO authenticated;