ALTER FUNCTION public.regenerar_linhas_ordem(uuid, text) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.regenerar_linhas_ordem(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.regenerar_linhas_ordem(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.regenerar_linhas_ordem(uuid, text) TO authenticated;