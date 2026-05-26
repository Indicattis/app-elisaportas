CREATE OR REPLACE FUNCTION public.get_colaboradores_folha()
 RETURNS TABLE(id uuid, nome text, custo_colaborador numeric, aux_combustivel numeric, insalubridade_pct numeric, fgts_pct numeric, previsao_13_valor numeric, em_folha boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, nome, custo_colaborador, aux_combustivel, insalubridade_pct, fgts_pct, previsao_13_valor, COALESCE(em_folha, false) AS em_folha
  FROM public.admin_users
  WHERE ativo = true
    AND tipo_usuario = 'colaborador'
  ORDER BY nome;
$function$;