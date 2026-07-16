
CREATE OR REPLACE FUNCTION public.get_active_users_basic()
RETURNS TABLE(id uuid, nome text, foto_perfil_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nome, foto_perfil_url
  FROM public.admin_users
  WHERE ativo = true
  ORDER BY nome;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_users_basic() TO authenticated;
