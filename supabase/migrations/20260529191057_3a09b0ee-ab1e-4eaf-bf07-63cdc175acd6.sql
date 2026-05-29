
-- ============================================
-- REFATURAMENTO GLOBAL DE VENDAS
-- ============================================
-- 1) Backfill tabela_precos_porta_id (portas, pintura, instalacao) por descricao + largura/altura (tolerância 15cm)
UPDATE produtos_vendas pv
SET tabela_precos_porta_id = (
  SELECT t.id FROM tabela_precos_portas t
  WHERE COALESCE(t.ativo, true) = true
    AND lower(trim(t.descricao)) = lower(trim(pv.descricao))
    AND t.largura IS NOT NULL AND t.altura IS NOT NULL
    AND abs(t.largura - pv.largura) <= 0.15
    AND abs(t.altura - pv.altura) <= 0.15
  ORDER BY abs(t.largura - pv.largura) + abs(t.altura - pv.altura)
  LIMIT 1
)
WHERE pv.tipo_produto IN ('porta_enrolar','porta_social','pintura_epoxi','instalacao')
  AND pv.tabela_precos_porta_id IS NULL
  AND pv.descricao IS NOT NULL
  AND pv.largura IS NOT NULL
  AND pv.altura IS NOT NULL;

-- 2) Backfill custos_itens_id (avulsos) por descricao normalizada
UPDATE produtos_vendas pv
SET custos_itens_id = (
  SELECT ci.id FROM custos_itens ci
  WHERE lower(trim(ci.descricao)) = lower(trim(pv.descricao))
  ORDER BY ci.created_at ASC
  LIMIT 1
)
WHERE pv.tipo_produto IN ('acessorio','adicional','manutencao')
  AND pv.custos_itens_id IS NULL
  AND pv.descricao IS NOT NULL;

-- 3) Recálculo lucro_item / custo_producao por tipo
-- 3.1 Portas (porta_enrolar / porta_social)
UPDATE produtos_vendas pv
SET lucro_item = COALESCE(t.lucro,0) * COALESCE(pv.quantidade,1),
    custo_producao = GREATEST(0, COALESCE(pv.valor_total,0) - COALESCE(t.lucro,0) * COALESCE(pv.quantidade,1)),
    faturamento = (COALESCE(t.lucro,0) * COALESCE(pv.quantidade,1)) > 0
FROM tabela_precos_portas t
WHERE pv.tabela_precos_porta_id = t.id
  AND pv.tipo_produto IN ('porta_enrolar','porta_social');

-- 3.2 Pintura via kit
UPDATE produtos_vendas pv
SET lucro_item = COALESCE(t.valor_pintura,0) * COALESCE(pv.quantidade,1),
    custo_producao = GREATEST(0, COALESCE(pv.valor_total,0) - COALESCE(t.valor_pintura,0) * COALESCE(pv.quantidade,1)),
    faturamento = (COALESCE(t.valor_pintura,0) * COALESCE(pv.quantidade,1)) > 0
FROM tabela_precos_portas t
WHERE pv.tabela_precos_porta_id = t.id
  AND pv.tipo_produto = 'pintura_epoxi';

-- 3.3 Instalação via kit
UPDATE produtos_vendas pv
SET lucro_item = COALESCE(t.valor_instalacao,0) * COALESCE(pv.quantidade,1),
    custo_producao = GREATEST(0, COALESCE(pv.valor_total,0) - COALESCE(t.valor_instalacao,0) * COALESCE(pv.quantidade,1)),
    faturamento = (COALESCE(t.valor_instalacao,0) * COALESCE(pv.quantidade,1)) > 0
FROM tabela_precos_portas t
WHERE pv.tabela_precos_porta_id = t.id
  AND pv.tipo_produto = 'instalacao';

-- 3.4 Avulsos via custos_itens (valor_total - custo_unitario * qty)
UPDATE produtos_vendas pv
SET lucro_item = COALESCE(pv.valor_total,0) - COALESCE(ci.custo_unitario,0) * COALESCE(pv.quantidade,1),
    custo_producao = COALESCE(ci.custo_unitario,0) * COALESCE(pv.quantidade,1),
    faturamento = COALESCE(pv.valor_total,0) > 0
FROM custos_itens ci
WHERE pv.custos_itens_id = ci.id
  AND pv.tipo_produto IN ('acessorio','adicional','manutencao');

-- 4) Fallbacks (sem FK após backfill)
-- 4.1 Pintura sem kit: 30%
UPDATE produtos_vendas
SET lucro_item = COALESCE(valor_total,0) * 0.30,
    custo_producao = COALESCE(valor_total,0) * 0.70,
    faturamento = COALESCE(valor_total,0) > 0
WHERE tipo_produto = 'pintura_epoxi' AND tabela_precos_porta_id IS NULL;

-- 4.2 Instalação sem kit: 40%
UPDATE produtos_vendas
SET lucro_item = COALESCE(valor_total,0) * 0.40,
    custo_producao = COALESCE(valor_total,0) * 0.60,
    faturamento = COALESCE(valor_total,0) > 0
WHERE tipo_produto = 'instalacao' AND tabela_precos_porta_id IS NULL;

-- 4.3 Portas sem kit: lucro 0
UPDATE produtos_vendas
SET lucro_item = 0,
    custo_producao = COALESCE(valor_total,0),
    faturamento = false
WHERE tipo_produto IN ('porta_enrolar','porta_social') AND tabela_precos_porta_id IS NULL;

-- 4.4 Avulsos sem custos_itens: lucro 0
UPDATE produtos_vendas
SET lucro_item = 0,
    custo_producao = COALESCE(valor_total,0),
    faturamento = false
WHERE tipo_produto IN ('acessorio','adicional','manutencao') AND custos_itens_id IS NULL;

-- 5) Recalcular agregados em vendas
WITH agg AS (
  SELECT venda_id,
    SUM(COALESCE(lucro_item,0)) AS lucro_prod,
    SUM(COALESCE(custo_producao,0)) AS custo_prod,
    bool_or(tipo_produto = 'instalacao') AS tem_inst_produto
  FROM produtos_vendas
  GROUP BY venda_id
)
UPDATE vendas v
SET lucro_total = COALESCE(agg.lucro_prod,0)
                + CASE WHEN NOT COALESCE(agg.tem_inst_produto,false) AND COALESCE(v.valor_instalacao,0) > 0
                       THEN COALESCE(v.valor_instalacao,0) * 0.40 ELSE 0 END
                + COALESCE(v.valor_credito,0),
    custo_total = COALESCE(agg.custo_prod,0)
                + CASE WHEN NOT COALESCE(agg.tem_inst_produto,false) AND COALESCE(v.valor_instalacao,0) > 0
                       THEN COALESCE(v.valor_instalacao,0) * 0.60 ELSE 0 END,
    instalacao_faturada = CASE
      WHEN NOT COALESCE(agg.tem_inst_produto,false) AND COALESCE(v.valor_instalacao,0) > 0 THEN true
      ELSE v.instalacao_faturada
    END,
    lucro_instalacao = CASE
      WHEN NOT COALESCE(agg.tem_inst_produto,false) AND COALESCE(v.valor_instalacao,0) > 0 THEN COALESCE(v.valor_instalacao,0) * 0.40
      ELSE v.lucro_instalacao
    END,
    custo_instalacao = CASE
      WHEN NOT COALESCE(agg.tem_inst_produto,false) AND COALESCE(v.valor_instalacao,0) > 0 THEN COALESCE(v.valor_instalacao,0) * 0.60
      ELSE v.custo_instalacao
    END
FROM agg
WHERE v.id = agg.venda_id;
