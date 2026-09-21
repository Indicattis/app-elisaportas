ALTER FUNCTION public.validar_midia_final_visita() SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.validar_midia_final_visita() FROM PUBLIC, anon, authenticated;