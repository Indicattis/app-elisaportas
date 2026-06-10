
-- Recalcula lucro_item/custo_producao das linhas auto-fatura veis de uma venda
-- a partir da configuracao em vendas_config_lucro e tabela_precos_portas.
-- Se p_finalizar=true e a venda for elegivel, marca venda como faturada.
CREATE OR REPLACE FUNCTION public.recalcular_lucro_venda(
  p_venda_id uuid,
  p_finalizar boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venda record;
  v_linha record;
  v_cfg_pintura record;
  v_pct_instalacao numeric;
  v_valor_m2 numeric;
  v_altura numeric;
  v_largura numeric;
  v_lucro numeric;
  v_custo numeric;
  v_lucro_tabela numeric;
  v_partes text[];
  v_atualizadas int := 0;
  v_custo_total numeric := 0;
  v_lucro_total numeric := 0;
  v_lucro_instalacao_legada numeric := 0;
  v_custo_instalacao_legada numeric := 0;
  v_valor_instalacao_legada numeric := 0;
  v_tem_instalacao_produto boolean := false;
  v_faturada boolean := false;
  v_pct_pintura numeric;
  v_modo_pintura text;
BEGIN
  SELECT id, valor_instalacao, lucro_total
    INTO v_venda
  FROM public.vendas
  WHERE id = p_venda_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro','venda nao encontrada');
  END IF;

  -- Nao mexer em vendas ja faturadas (lucro_total IS NOT NULL implica faturada)
  IF v_venda.lucro_total IS NOT NULL THEN
    RETURN jsonb_build_object('ignorada', true, 'motivo','ja_faturada');
  END IF;

  -- Carrega config pintura
  SELECT modo, percentual_custo, parametros
    INTO v_cfg_pintura
  FROM public.vendas_config_lucro
  WHERE tipo = 'pintura_epoxi';
  IF NOT FOUND THEN
    v_modo_pintura := 'estatico';
    v_pct_pintura := 60;
    v_valor_m2 := 25;
  ELSE
    v_modo_pintura := COALESCE(v_cfg_pintura.modo, 'estatico');
    v_pct_pintura := COALESCE(v_cfg_pintura.percentual_custo, 60);
    v_valor_m2 := COALESCE(NULLIF((v_cfg_pintura.parametros->>'valor_m2')::numeric, 0), 25);
  END IF;

  -- Carrega % custo instalacao
  SELECT percentual_custo INTO v_pct_instalacao
  FROM public.vendas_config_lucro WHERE tipo = 'instalacao';
  IF v_pct_instalacao IS NULL THEN v_pct_instalacao := 60; END IF;

  -- Itera linhas auto-faturaveis ainda nao faturadas
  FOR v_linha IN
    SELECT id, tipo_produto, valor_total, altura, largura, tamanho, quantidade, tabela_precos_porta_id
    FROM public.produtos_vendas
    WHERE venda_id = p_venda_id
      AND COALESCE(faturamento, false) = false
  LOOP
    v_lucro := NULL;
    v_custo := NULL;

    IF v_linha.tipo_produto = 'pintura_epoxi' THEN
      v_altura := COALESCE(v_linha.altura, 0);
      v_largura := COALESCE(v_linha.largura, 0);
      IF (v_altura = 0 OR v_largura = 0) AND v_linha.tamanho IS NOT NULL THEN
        v_partes := string_to_array(v_linha.tamanho, 'x');
        IF array_length(v_partes,1) = 2 THEN
          v_largura := COALESCE(NULLIF(v_partes[1],'')::numeric, 0);
          v_altura  := COALESCE(NULLIF(v_partes[2],'')::numeric, 0);
        END IF;
      END IF;
      IF v_modo_pintura = 'formula_dimensao' THEN
        v_lucro := v_altura * v_largura * v_valor_m2;
        v_custo := GREATEST(0, COALESCE(v_linha.valor_total,0) - v_lucro);
      ELSE
        v_custo := COALESCE(v_linha.valor_total,0) * (v_pct_pintura / 100);
        v_lucro := COALESCE(v_linha.valor_total,0) - v_custo;
      END IF;

    ELSIF v_linha.tipo_produto = 'instalacao' THEN
      v_custo := COALESCE(v_linha.valor_total,0) * (v_pct_instalacao / 100);
      v_lucro := COALESCE(v_linha.valor_total,0) - v_custo;

    ELSIF v_linha.tipo_produto = 'porta_enrolar' THEN
      v_altura := COALESCE(v_linha.altura, 0);
      v_largura := COALESCE(v_linha.largura, 0);
      IF (v_altura = 0 OR v_largura = 0) AND v_linha.tamanho IS NOT NULL THEN
        v_partes := string_to_array(v_linha.tamanho, 'x');
        IF array_length(v_partes,1) = 2 THEN
          v_largura := COALESCE(NULLIF(v_partes[1],'')::numeric, 0);
          v_altura  := COALESCE(NULLIF(v_partes[2],'')::numeric, 0);
        END IF;
      END IF;

      v_lucro_tabela := NULL;

      -- Preferencia: kit vinculado
      IF v_linha.tabela_precos_porta_id IS NOT NULL THEN
        SELECT lucro INTO v_lucro_tabela
        FROM public.tabela_precos_portas
        WHERE id = v_linha.tabela_precos_porta_id;
      END IF;

      -- Fallback: match por dimensao com tolerancia 15cm
      IF v_lucro_tabela IS NULL AND v_largura > 0 AND v_altura > 0 THEN
        SELECT lucro INTO v_lucro_tabela
        FROM public.tabela_precos_portas
        WHERE COALESCE(ativo,true) = true
          AND largura >= v_largura - 0.15
          AND altura  >= v_altura  - 0.15
        ORDER BY largura ASC, altura ASC
        LIMIT 1;
      END IF;

      IF v_lucro_tabela IS NOT NULL THEN
        v_lucro := v_lucro_tabela * COALESCE(v_linha.quantidade,1);
        v_custo := COALESCE(v_linha.valor_total,0) - v_lucro;
      END IF;
    END IF;

    IF v_lucro IS NOT NULL THEN
      UPDATE public.produtos_vendas
        SET lucro_item = v_lucro,
            custo_producao = v_custo,
            updated_at = now()
      WHERE id = v_linha.id;
      v_atualizadas := v_atualizadas + 1;
    END IF;
  END LOOP;

  IF NOT p_finalizar THEN
    RETURN jsonb_build_object('atualizadas', v_atualizadas, 'faturada', false);
  END IF;

  -- Para finalizar: precisa ter pelo menos 1 produto e nao restar linha sem lucro
  IF NOT EXISTS (SELECT 1 FROM public.produtos_vendas WHERE venda_id = p_venda_id) THEN
    RETURN jsonb_build_object('ignorada', true, 'motivo','sem_produtos','atualizadas',v_atualizadas);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.produtos_vendas
    WHERE venda_id = p_venda_id
      AND COALESCE(faturamento,false) = false
      AND (lucro_item IS NULL)
  ) THEN
    RETURN jsonb_build_object('ignorada', true, 'motivo','linha_sem_lucro','atualizadas',v_atualizadas);
  END IF;

  SELECT
    COALESCE(SUM(custo_producao),0),
    COALESCE(SUM(lucro_item),0),
    bool_or(tipo_produto = 'instalacao')
  INTO v_custo_total, v_lucro_total, v_tem_instalacao_produto
  FROM public.produtos_vendas
  WHERE venda_id = p_venda_id;

  -- Instalacao legada (sem produto separado) mantem regra fixa 40%
  IF NOT v_tem_instalacao_produto AND COALESCE(v_venda.valor_instalacao,0) > 0 THEN
    v_valor_instalacao_legada := v_venda.valor_instalacao;
    v_lucro_instalacao_legada := v_valor_instalacao_legada * 0.40;
    v_custo_instalacao_legada := v_valor_instalacao_legada - v_lucro_instalacao_legada;
  END IF;

  UPDATE public.vendas
  SET custo_total = v_custo_total + v_custo_instalacao_legada,
      lucro_total = v_lucro_total + v_lucro_instalacao_legada,
      frete_aprovado = true,
      lucro_instalacao = CASE WHEN v_lucro_instalacao_legada > 0 THEN v_lucro_instalacao_legada ELSE NULL END,
      custo_instalacao = CASE WHEN v_custo_instalacao_legada > 0 THEN v_custo_instalacao_legada ELSE NULL END,
      instalacao_faturada = v_lucro_instalacao_legada > 0,
      updated_at = now()
  WHERE id = p_venda_id;

  UPDATE public.produtos_vendas
  SET faturamento = true, updated_at = now()
  WHERE venda_id = p_venda_id;

  v_faturada := true;
  RETURN jsonb_build_object('atualizadas', v_atualizadas, 'faturada', v_faturada);
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalcular_lucro_venda(uuid, boolean) TO authenticated, service_role;


-- Processa em lote todas as vendas em aberto (lucro_total IS NULL).
-- p_somente_dispensadas: filtra para dispensada_sistema = true
-- p_finalizar: tenta finalizar o faturamento de cada uma
CREATE OR REPLACE FUNCTION public.recalcular_lucro_vendas_em_aberto(
  p_somente_dispensadas boolean DEFAULT false,
  p_finalizar boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venda_id uuid;
  v_result jsonb;
  v_total int := 0;
  v_faturadas int := 0;
  v_ignoradas int := 0;
  v_erros int := 0;
BEGIN
  FOR v_venda_id IN
    SELECT v.id
    FROM public.vendas v
    WHERE v.lucro_total IS NULL
      AND (NOT p_somente_dispensadas OR COALESCE(v.dispensada_sistema,false) = true)
      AND (
        NOT p_finalizar
        OR COALESCE(v.dispensada_sistema,false) = true
        OR EXISTS (SELECT 1 FROM public.pedidos_producao pp WHERE pp.venda_id = v.id)
      )
  LOOP
    v_total := v_total + 1;
    BEGIN
      v_result := public.recalcular_lucro_venda(v_venda_id, p_finalizar);
      IF (v_result->>'faturada') = 'true' THEN
        v_faturadas := v_faturadas + 1;
      ELSIF (v_result->>'ignorada') = 'true' THEN
        v_ignoradas := v_ignoradas + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_erros := v_erros + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processadas', v_total,
    'faturadas', v_faturadas,
    'ignoradas', v_ignoradas,
    'erros', v_erros
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalcular_lucro_vendas_em_aberto(boolean, boolean) TO authenticated, service_role;
