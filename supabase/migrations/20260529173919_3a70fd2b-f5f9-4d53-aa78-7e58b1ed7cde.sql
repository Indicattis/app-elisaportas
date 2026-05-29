-- Add custos_itens_id to produtos_vendas and backfill via name match
ALTER TABLE public.produtos_vendas
  ADD COLUMN IF NOT EXISTS custos_itens_id uuid REFERENCES public.custos_itens(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_vendas_custos_itens_id
  ON public.produtos_vendas(custos_itens_id);

-- Backfill: match vendas_catalogo.nome_produto -> custos_itens.descricao (case + trim insensitive)
UPDATE public.produtos_vendas pv
SET custos_itens_id = ci.id
FROM public.vendas_catalogo vc
JOIN public.custos_itens ci
  ON lower(trim(vc.nome_produto)) = lower(trim(ci.descricao))
WHERE pv.vendas_catalogo_id = vc.id
  AND pv.custos_itens_id IS NULL;