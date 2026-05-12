CREATE OR REPLACE FUNCTION public.get_responsaveis_internos()
RETURNS TABLE (id uuid, nome text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nome
  FROM public.admin_users
  WHERE ativo = true
    AND tipo_usuario IN ('colaborador', 'metamorfo', 'atendente')
  ORDER BY nome;
$$;

GRANT EXECUTE ON FUNCTION public.get_responsaveis_internos() TO authenticated;