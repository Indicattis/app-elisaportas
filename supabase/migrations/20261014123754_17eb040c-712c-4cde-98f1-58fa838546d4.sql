ALTER FUNCTION public.regenerar_linhas_ordem(uuid, text) SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.regenerar_linhas_ordem(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.regenerar_linhas_ordem(uuid, text) TO authenticated;