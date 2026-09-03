CREATE OR REPLACE FUNCTION public.deletar_pedido_completo(p_pedido_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pedidos_producao WHERE id = p_pedido_id) THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  DELETE FROM pontuacao_colaboradores
   WHERE linha_id IN (SELECT id FROM linhas_ordens WHERE pedido_id = p_pedido_id);

  DELETE FROM linhas_ordens WHERE pedido_id = p_pedido_id;
  DELETE FROM ordens_soldagem WHERE pedido_id = p_pedido_id;
  DELETE FROM ordens_perfiladeira WHERE pedido_id = p_pedido_id;
  DELETE FROM ordens_pintura WHERE pedido_id = p_pedido_id;
  DELETE FROM ordens_qualidade WHERE pedido_id = p_pedido_id;
  DELETE FROM ordens_embalagem WHERE pedido_id = p_pedido_id;
  DELETE FROM ordens_separacao WHERE pedido_id = p_pedido_id;
  DELETE FROM ordens_carregamento WHERE pedido_id = p_pedido_id;
  DELETE FROM ordens_terceirizacao WHERE pedido_id = p_pedido_id;
  DELETE FROM ordens_porta_social WHERE pedido_id = p_pedido_id;
  DELETE FROM pedido_porta_observacoes WHERE pedido_id = p_pedido_id;
  DELETE FROM pedido_porta_social_observacoes WHERE pedido_id = p_pedido_id;
  DELETE FROM pedido_linhas WHERE pedido_id = p_pedido_id;
  DELETE FROM pedidos_etapas WHERE pedido_id = p_pedido_id;
  DELETE FROM pedidos_movimentacoes WHERE pedido_id = p_pedido_id;
  DELETE FROM pedidos_producao WHERE id = p_pedido_id;

  RETURN TRUE;
END;
$function$;