-- Adicionar campos faltantes em custos_itens para refletir as colunas originais
ALTER TABLE public.custos_itens
  ADD COLUMN IF NOT EXISTS fornecedor text,
  ADD COLUMN IF NOT EXISTS quantidade numeric(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantidade_ideal numeric(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantidade_maxima numeric(14,4) NOT NULL DEFAULT 0;

-- Recopiar dados de estoque para preencher os novos campos (apenas onde estiverem zerados/null)
UPDATE public.custos_itens ci
SET
  fornecedor = COALESCE(ci.fornecedor, f.nome),
  quantidade = COALESCE(NULLIF(ci.quantidade, 0), e.quantidade, 0),
  quantidade_ideal = COALESCE(NULLIF(ci.quantidade_ideal, 0), e.quantidade_ideal, 0),
  quantidade_maxima = COALESCE(NULLIF(ci.quantidade_maxima, 0), e.quantidade_maxima, 0)
FROM public.estoque e
LEFT JOIN public.fornecedores f ON f.id = e.fornecedor_id
WHERE lower(trim(e.nome_produto)) = lower(trim(ci.descricao));