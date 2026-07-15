CREATE OR REPLACE FUNCTION public.recalcular_balanco_desconto_vendas(p_inicio timestamptz, p_fim timestamptz)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_regras RECORD;
  v_venda RECORD;
  v_total numeric;
  v_desc numeric;
  v_pct_dado numeric;
  v_limite_base numeric;
  v_limite numeric;
  v_balanco numeric;
  v_tipo text;
  v_count integer := 0;
  v_tem_aut boolean;
BEGIN
  SELECT limite_desconto_avista, limite_desconto_fria, limite_adicional_responsavel
    INTO v_regras
  FROM public.regras_vendas
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_regras IS NULL THEN
    v_regras.limite_desconto_avista := 3;
    v_regras.limite_desconto_fria := 5;
    v_regras.limite_adicional_responsavel := 7;
  END IF;

  FOR v_venda IN
    SELECT v.id, v.data_venda, v.temperatura, v.forma_pagamento, v.valor_venda
    FROM public.vendas v
    WHERE COALESCE(v.is_rascunho,false) = false
      AND COALESCE(v.valor_venda,0) >= 500
      AND v.data_venda >= p_inicio AND v.data_venda < p_fim
  LOOP
    SELECT
      COALESCE(SUM((COALESCE(pv.valor_produto,0) + COALESCE(pv.valor_pintura,0) + COALESCE(pv.valor_instalacao,0)) * COALESCE(pv.quantidade,1)),0),
      COALESCE(SUM(
        CASE
          WHEN pv.tipo_desconto = 'valor' THEN COALESCE(pv.desconto_valor,0)
          ELSE (COALESCE(pv.valor_produto,0) + COALESCE(pv.valor_pintura,0) + COALESCE(pv.valor_instalacao,0)) * COALESCE(pv.quantidade,1) * COALESCE(pv.desconto_percentual,0) / 100
        END
      ),0)
    INTO v_total, v_desc
    FROM public.produtos_vendas pv
    WHERE pv.venda_id = v_venda.id;

    IF v_total <= 0 THEN
      CONTINUE;
    END IF;

    v_pct_dado := v_desc / v_total * 100;

    v_limite_base := CASE
      WHEN COALESCE(v_venda.forma_pagamento,'') = '' OR v_venda.forma_pagamento = 'cartao_credito' THEN 0
      ELSE COALESCE(v_regras.limite_desconto_avista,0)
    END;
    IF COALESCE(v_venda.temperatura,false) THEN
      v_limite_base := v_limite_base + COALESCE(v_regras.limite_desconto_fria,0);
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.vendas_autorizacoes_desconto
      WHERE venda_id = v_venda.id
    ) INTO v_tem_aut;

    v_limite := v_limite_base;
    IF v_tem_aut OR v_pct_dado > v_limite_base THEN
      v_limite := v_limite + COALESCE(v_regras.limite_adicional_responsavel,0);
    END IF;

    v_balanco := (v_limite - v_pct_dado) / 100 * v_total;

    v_tipo := CASE
      WHEN v_balanco > 0.01 THEN 'positivo'
      WHEN v_balanco < -0.01 THEN 'negativo'
      ELSE 'neutro'
    END;

    INSERT INTO public.vendas_balanco_desconto(
      venda_id, total_venda, desconto_dado, pct_desconto_dado, pct_limite_permitido,
      valor_balanco, tipo, data_venda
    ) VALUES (
      v_venda.id, v_total, v_desc, v_pct_dado, v_limite, v_balanco, v_tipo, v_venda.data_venda
    )
    ON CONFLICT (venda_id) DO UPDATE SET
      total_venda = EXCLUDED.total_venda,
      desconto_dado = EXCLUDED.desconto_dado,
      pct_desconto_dado = EXCLUDED.pct_desconto_dado,
      pct_limite_permitido = EXCLUDED.pct_limite_permitido,
      valor_balanco = EXCLUDED.valor_balanco,
      tipo = EXCLUDED.tipo,
      data_venda = EXCLUDED.data_venda,
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;