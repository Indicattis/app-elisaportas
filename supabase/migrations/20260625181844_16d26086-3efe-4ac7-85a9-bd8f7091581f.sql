CREATE OR REPLACE FUNCTION public.regenerar_linhas_ordem(p_ordem_id uuid, p_tipo_ordem text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pedido_id UUID;
  v_status TEXT;
  v_linha RECORD;
  v_count INTEGER := 0;
BEGIN
  CASE p_tipo_ordem
    WHEN 'soldagem' THEN
      SELECT pedido_id, status INTO v_pedido_id, v_status FROM ordens_soldagem WHERE id = p_ordem_id;
    WHEN 'perfiladeira' THEN
      SELECT pedido_id, status INTO v_pedido_id, v_status FROM ordens_perfiladeira WHERE id = p_ordem_id;
    WHEN 'separacao' THEN
      SELECT pedido_id, status INTO v_pedido_id, v_status FROM ordens_separacao WHERE id = p_ordem_id;
    WHEN 'qualidade' THEN
      SELECT pedido_id, status INTO v_pedido_id, v_status FROM ordens_qualidade WHERE id = p_ordem_id;
    WHEN 'pintura' THEN
      SELECT pedido_id, status INTO v_pedido_id, v_status FROM ordens_pintura WHERE id = p_ordem_id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Tipo de ordem inválido');
  END CASE;

  IF v_pedido_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ordem não encontrada');
  END IF;

  IF v_status = 'concluido' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é possível regenerar linhas de uma ordem concluída');
  END IF;

  -- Limpar pontuações vinculadas às linhas que serão regeneradas
  DELETE FROM pontuacao_colaboradores
  WHERE ordem_id = p_ordem_id AND tipo_ordem = p_tipo_ordem;

  DELETE FROM linhas_ordens
  WHERE ordem_id = p_ordem_id AND tipo_ordem = p_tipo_ordem;

  IF p_tipo_ordem IN ('soldagem', 'perfiladeira', 'separacao') THEN
    FOR v_linha IN
      SELECT pl.id as pedido_linha_id, pl.quantidade, pl.estoque_id,
        COALESCE(e.nome_produto, pl.nome_produto) as nome_produto_final,
        pv.tamanho, pv.largura, pv.altura, pv.tipo_pintura,
        cc.nome as cor_nome, pl.produto_venda_id
      FROM pedido_linhas pl
      LEFT JOIN estoque e ON pl.estoque_id = e.id
      LEFT JOIN produtos_vendas pv ON pl.produto_venda_id = pv.id
      LEFT JOIN catalogo_cores cc ON pv.cor_id = cc.id
      WHERE pl.pedido_id = v_pedido_id
        AND COALESCE(
          e.setor_responsavel_producao::text,
          CASE pl.categoria_linha
            WHEN 'solda' THEN 'soldagem'
            WHEN 'perfiladeira' THEN 'perfiladeira'
            WHEN 'separacao' THEN 'separacao'
            ELSE NULL
          END
        ) = p_tipo_ordem
    LOOP
      INSERT INTO linhas_ordens (pedido_id, ordem_id, tipo_ordem, pedido_linha_id, estoque_id,
        produto_venda_id, item, quantidade, tamanho, largura, altura, tipo_pintura, cor_nome, concluida)
      VALUES (v_pedido_id, p_ordem_id, p_tipo_ordem, v_linha.pedido_linha_id,
        v_linha.estoque_id, v_linha.produto_venda_id,
        COALESCE(v_linha.nome_produto_final, 'Item'), v_linha.quantidade,
        v_linha.tamanho, v_linha.largura, v_linha.altura,
        v_linha.tipo_pintura, v_linha.cor_nome, false);
      v_count := v_count + 1;
    END LOOP;

  ELSIF p_tipo_ordem = 'qualidade' THEN
    FOR v_linha IN
      SELECT pl.id as pedido_linha_id, pl.quantidade, pl.estoque_id,
        COALESCE(e.nome_produto, pl.nome_produto) as nome_produto_final,
        pv.tamanho, pv.largura, pv.altura, pv.tipo_pintura,
        cc.nome as cor_nome, pl.produto_venda_id
      FROM pedido_linhas pl
      LEFT JOIN estoque e ON pl.estoque_id = e.id
      LEFT JOIN produtos_vendas pv ON pl.produto_venda_id = pv.id
      LEFT JOIN catalogo_cores cc ON pv.cor_id = cc.id
      WHERE pl.pedido_id = v_pedido_id
        AND pl.categoria_linha != 'separacao'
    LOOP
      INSERT INTO linhas_ordens (pedido_id, ordem_id, tipo_ordem, pedido_linha_id, estoque_id,
        produto_venda_id, item, quantidade, tamanho, largura, altura, tipo_pintura, cor_nome, concluida)
      VALUES (v_pedido_id, p_ordem_id, p_tipo_ordem, v_linha.pedido_linha_id,
        v_linha.estoque_id, v_linha.produto_venda_id,
        COALESCE(v_linha.nome_produto_final, 'Item'), v_linha.quantidade,
        v_linha.tamanho, v_linha.largura, v_linha.altura,
        v_linha.tipo_pintura, v_linha.cor_nome, false);
      v_count := v_count + 1;
    END LOOP;

  ELSIF p_tipo_ordem = 'pintura' THEN
    FOR v_linha IN
      SELECT pl.id as pedido_linha_id, pl.quantidade, pl.estoque_id,
        e.nome_produto as nome_produto_final,
        pv.tamanho, pv.largura, pv.altura, pv.tipo_pintura,
        cc.nome as cor_nome, pl.produto_venda_id
      FROM pedido_linhas pl
      JOIN estoque e ON pl.estoque_id = e.id
      LEFT JOIN produtos_vendas pv ON pl.produto_venda_id = pv.id
      LEFT JOIN catalogo_cores cc ON pv.cor_id = cc.id
      WHERE pl.pedido_id = v_pedido_id
        AND e.requer_pintura = true
    LOOP
      INSERT INTO linhas_ordens (pedido_id, ordem_id, tipo_ordem, pedido_linha_id, estoque_id,
        produto_venda_id, item, quantidade, tamanho, largura, altura, tipo_pintura, cor_nome, concluida)
      VALUES (v_pedido_id, p_ordem_id, p_tipo_ordem, v_linha.pedido_linha_id,
        v_linha.estoque_id, v_linha.produto_venda_id,
        COALESCE(v_linha.nome_produto_final, 'Item'), v_linha.quantidade,
        v_linha.tamanho, v_linha.largura, v_linha.altura,
        v_linha.tipo_pintura, v_linha.cor_nome, false);
      v_count := v_count + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'linhas_criadas', v_count);
END;
$function$;