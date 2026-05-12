CREATE OR REPLACE FUNCTION public.list_atendentes_for_filter()
RETURNS TABLE(user_id uuid, nome text, ativo boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT user_id, nome, ativo
  FROM public.admin_users
  WHERE role = 'atendente'
    AND tipo_usuario IN ('colaborador','arquivado')
  ORDER BY nome;
$$;

GRANT EXECUTE ON FUNCTION public.list_atendentes_for_filter() TO authenticated;