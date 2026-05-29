ALTER TABLE public.produtos_vendas
  ADD COLUMN IF NOT EXISTS tabela_precos_porta_id uuid NULL
  REFERENCES public.tabela_precos_portas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_vendas_tabela_precos_porta
  ON public.produtos_vendas(tabela_precos_porta_id);

WITH candidatos AS (
  SELECT
    pv.id AS pv_id,
    tp.id AS kit_id,
    ROW_NUMBER() OVER (
      PARTITION BY pv.id
      ORDER BY (ABS(COALESCE(pv.largura,0) - COALESCE(tp.largura,0))
              + ABS(COALESCE(pv.altura,0)  - COALESCE(tp.altura,0))) ASC
    ) AS rn
  FROM public.produtos_vendas pv
  JOIN public.tabela_precos_portas tp
    ON tp.ativo = true
   AND ABS(COALESCE(pv.largura,0) - COALESCE(tp.largura,0)) <= 0.15
   AND ABS(COALESCE(pv.altura,0)  - COALESCE(tp.altura,0))  <= 0.15
  WHERE pv.tabela_precos_porta_id IS NULL
    AND pv.tipo_produto IN ('porta_enrolar','porta_social','pintura_epoxi','instalacao')
    AND pv.largura IS NOT NULL AND pv.altura IS NOT NULL
)
UPDATE public.produtos_vendas pv
SET tabela_precos_porta_id = c.kit_id
FROM candidatos c
WHERE c.pv_id = pv.id AND c.rn = 1;

WITH portas_link AS (
  SELECT DISTINCT ON (venda_id, largura, altura)
         venda_id, largura, altura, tabela_precos_porta_id AS kit_id
  FROM public.produtos_vendas
  WHERE tipo_produto IN ('porta_enrolar','porta_social')
    AND tabela_precos_porta_id IS NOT NULL
  ORDER BY venda_id, largura, altura, created_at
)
UPDATE public.produtos_vendas pv
SET tabela_precos_porta_id = p.kit_id
FROM portas_link p
WHERE pv.tabela_precos_porta_id IS NULL
  AND pv.tipo_produto IN ('pintura_epoxi','instalacao')
  AND pv.venda_id = p.venda_id
  AND pv.largura = p.largura
  AND pv.altura = p.altura;