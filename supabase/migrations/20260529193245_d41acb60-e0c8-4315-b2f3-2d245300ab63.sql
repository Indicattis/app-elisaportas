-- Refaturamento Portas: match agressivo por dimensão/valor + lucro médio do catálogo para órfãos
DO $$
DECLARE
  avg_margin numeric;
BEGIN
  -- 1) Match por dimensão (15cm tolerância), tiebreak: kit cujo valor_porta é mais próximo do valor_produto
  UPDATE produtos_vendas pv
  SET tabela_precos_porta_id = sub.kit_id
  FROM (
    SELECT DISTINCT ON (pv.id) pv.id AS pv_id, tp.id AS kit_id
    FROM produtos_vendas pv
    JOIN tabela_precos_portas tp
      ON ABS(tp.largura - pv.largura) <= 0.15
     AND ABS(tp.altura - pv.altura) <= 0.15
    WHERE pv.tipo_produto IN ('porta_enrolar','porta_social')
      AND pv.tabela_precos_porta_id IS NULL
      AND pv.largura IS NOT NULL
      AND pv.altura IS NOT NULL
    ORDER BY pv.id, ABS(COALESCE(tp.valor_porta,0) - COALESCE(pv.valor_produto,0)) ASC
  ) sub
  WHERE pv.id = sub.pv_id;

  -- 2) Match por proximidade de valor_porta (±5%) para linhas sem dimensão
  UPDATE produtos_vendas pv
  SET tabela_precos_porta_id = sub.kit_id
  FROM (
    SELECT DISTINCT ON (pv.id) pv.id AS pv_id, tp.id AS kit_id
    FROM produtos_vendas pv
    JOIN tabela_precos_portas tp
      ON tp.valor_porta > 0
     AND pv.valor_produto > 0
     AND ABS(tp.valor_porta - pv.valor_produto) / pv.valor_produto <= 0.05
    WHERE pv.tipo_produto IN ('porta_enrolar','porta_social')
      AND pv.tabela_precos_porta_id IS NULL
    ORDER BY pv.id, ABS(tp.valor_porta - pv.valor_produto) ASC
  ) sub
  WHERE pv.id = sub.pv_id;

  -- 3) Recalcular lucro_item das portas vinculadas a kit
  UPDATE produtos_vendas pv
  SET lucro_item = COALESCE(tp.lucro,0) * COALESCE(pv.quantidade,1)
  FROM tabela_precos_portas tp
  WHERE pv.tabela_precos_porta_id = tp.id
    AND pv.tipo_produto IN ('porta_enrolar','porta_social');

  -- 4) Para órfãos restantes: aplicar margem média ponderada do catálogo
  SELECT (SUM(lucro) / NULLIF(SUM(valor_porta),0))
    INTO avg_margin
  FROM tabela_precos_portas
  WHERE valor_porta > 0;

  avg_margin := COALESCE(avg_margin, 0.27);

  UPDATE produtos_vendas pv
  SET lucro_item = COALESCE(pv.valor_produto,0) * COALESCE(pv.quantidade,1) * avg_margin
  FROM vendas v
  WHERE pv.venda_id = v.id
    AND pv.tipo_produto IN ('porta_enrolar','porta_social')
    AND pv.tabela_precos_porta_id IS NULL;

  -- 5) Atualizar agregados em vendas
  WITH agg AS (
    SELECT 
      pv.venda_id,
      SUM(COALESCE(pv.lucro_item,0)) AS soma_lucro,
      SUM(COALESCE(pv.custo_producao,0)) AS soma_custo
    FROM produtos_vendas pv
    GROUP BY pv.venda_id
  )
  UPDATE vendas v
  SET 
    lucro_total = COALESCE(agg.soma_lucro,0) + COALESCE(v.valor_credito,0),
    custo_total = COALESCE(agg.soma_custo,0)
  FROM agg
  WHERE v.id = agg.venda_id;
END $$;