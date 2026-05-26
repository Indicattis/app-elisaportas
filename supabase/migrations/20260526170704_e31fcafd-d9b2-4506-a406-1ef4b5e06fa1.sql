CREATE OR REPLACE FUNCTION public.get_colaboradores_folha()
RETURNS TABLE (
  id uuid,
  nome text,
  custo_colaborador numeric,
  aux_combustivel numeric,
  insalubridade_pct numeric,
  fgts_pct numeric,
  previsao_13_valor numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nome, custo_colaborador, aux_combustivel, insalubridade_pct, fgts_pct, previsao_13_valor
  FROM public.admin_users
  WHERE ativo = true
    AND tipo_usuario IN ('colaborador','metamorfo')
    AND em_folha = true
  ORDER BY nome;
$$;