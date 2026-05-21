ALTER TABLE public.custos_itens
  ADD COLUMN IF NOT EXISTS taxa_impostos numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_descontos numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_cartao numeric(6,2) NOT NULL DEFAULT 0;

UPDATE public.custos_itens ci
SET
  taxa_impostos = COALESCE(NULLIF(ci.taxa_impostos, 0), e.taxa_impostos, 0),
  taxa_descontos = COALESCE(NULLIF(ci.taxa_descontos, 0), e.taxa_descontos, 0),
  taxa_cartao = COALESCE(NULLIF(ci.taxa_cartao, 0), e.taxa_cartao, 0),
  preco_venda = COALESCE(NULLIF(ci.preco_venda, 0), e.preco_venda, 0)
FROM public.estoque e
WHERE lower(trim(e.nome_produto)) = lower(trim(ci.descricao));