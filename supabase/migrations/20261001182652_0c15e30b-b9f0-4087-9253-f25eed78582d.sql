CREATE OR REPLACE FUNCTION public.concluir_carregamento_e_avancar_pedido(p_ordem_carregamento_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pedido_id uuid;
  v_etapa_atual text;
  v_tipo_entrega text;
BEGIN
  SELECT oc.pedido_id, pp.etapa_atual, v.tipo_entrega
  INTO v_pedido_id, v_etapa_atual, v_tipo_entrega
  FROM ordens_carregamento oc
  LEFT JOIN pedidos_producao pp ON pp.id = oc.pedido_id
  LEFT JOIN vendas v ON v.id = oc.venda_id
  WHERE oc.id = p_ordem_carregamento_id;

  IF v_pedido_id IS NULL THEN
    RAISE EXCEPTION 'Ordem de carregamento não encontrada ou sem pedido associado';
  END IF;

  UPDATE ordens_carregamento
  SET carregamento_concluido = true,
      carregamento_concluido_em = now(),
      carregamento_concluido_por = auth.uid(),
      status = 'concluida',
      updated_at = now()
  WHERE id = p_ordem_carregamento_id;

  IF v_tipo_entrega IN ('entrega', 'autorizado') THEN
    UPDATE pedidos_etapas SET data_saida = now()
    WHERE pedido_id = v_pedido_id AND data_saida IS NULL;

    UPDATE pedidos_producao
    SET etapa_atual = 'finalizado', status = 'concluido', updated_at = now()
    WHERE id = v_pedido_id;

    INSERT INTO pedidos_etapas (pedido_id, etapa, data_entrada, checkboxes)
    VALUES (v_pedido_id, 'finalizado', now(), '[]'::jsonb)
    ON CONFLICT (pedido_id, etapa) DO UPDATE SET data_entrada = now();

    INSERT INTO pedidos_movimentacoes (pedido_id, user_id, etapa_origem, etapa_destino, teor, descricao)
    VALUES (v_pedido_id, auth.uid(), v_etapa_atual, 'finalizado', 'avanco', 'Pedido finalizado após conclusão do carregamento');
  END IF;
END;
$function$;