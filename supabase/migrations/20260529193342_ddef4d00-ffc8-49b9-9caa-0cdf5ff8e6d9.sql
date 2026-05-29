DO $$
DECLARE
  avg_margin numeric;
BEGIN
  SELECT (SUM(lucro) / NULLIF(SUM(valor_porta),0))
    INTO avg_margin
  FROM tabela_precos_portas
  WHERE valor_porta > 0 AND lucro > 0;

  avg_margin := COALESCE(avg_margin, 0.28);

  -- Aplicar margem média quando o kit casado tem lucro=0
  UPDATE produtos_vendas pv
  SET lucro_item = COALESCE(pv.valor_produto,0) * COALESCE(pv.quantidade,1) * avg_margin
  FROM tabela_precos_portas tp
  WHERE pv.tabela_precos_porta_id = tp.id
    AND pv.tipo_produto IN ('porta_enrolar','porta_social')
    AND COALESCE(tp.lucro,0) = 0;

  -- Ressincronizar agregados de vendas
  WITH agg AS (
    SELECT pv.venda_id,
           SUM(COALESCE(pv.lucro_item,0)) AS soma_lucro,
           SUM(COALESCE(pv.custo_producao,0)) AS soma_custo
    FROM produtos_vendas pv
    GROUP BY pv.venda_id
  )
  UPDATE vendas v
  SET lucro_total = COALESCE(agg.soma_lucro,0) + COALESCE(v.valor_credito,0),
      custo_total = COALESCE(agg.soma_custo,0)
  FROM agg
  WHERE v.id = agg.venda_id;
END $$;