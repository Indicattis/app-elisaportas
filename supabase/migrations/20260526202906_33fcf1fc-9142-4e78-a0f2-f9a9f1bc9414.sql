GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas_manuais_folha TO authenticated;
GRANT ALL ON public.despesas_manuais_folha TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas_manuais_lancamentos TO authenticated;
GRANT ALL ON public.despesas_manuais_lancamentos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas_padrao TO authenticated;
GRANT ALL ON public.despesas_padrao TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas_mes_status TO authenticated;
GRANT ALL ON public.despesas_mes_status TO service_role;