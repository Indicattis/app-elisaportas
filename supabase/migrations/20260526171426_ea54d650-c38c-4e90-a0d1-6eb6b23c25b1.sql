DROP FUNCTION IF EXISTS public.get_colaboradores_folha();

CREATE FUNCTION public.get_colaboradores_folha()
RETURNS TABLE (
  id uuid,
  nome text,
  custo_colaborador numeric,
  aux_combustivel numeric,
  insalubridade_pct numeric,
  fgts_pct numeric,
  previsao_13_valor numeric,
  em_folha boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nome, custo_colaborador, aux_combustivel, insalubridade_pct, fgts_pct, previsao_13_valor, COALESCE(em_folha, false) AS em_folha
  FROM public.admin_users
  WHERE ativo = true
    AND tipo_usuario IN ('colaborador','metamorfo')
  ORDER BY nome;
$$;

GRANT EXECUTE ON FUNCTION public.get_colaboradores_folha() TO authenticated;