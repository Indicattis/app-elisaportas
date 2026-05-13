ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS contrato_dispensado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contrato_dispensado_em timestamptz,
  ADD COLUMN IF NOT EXISTS contrato_dispensado_por uuid;

UPDATE public.vendas v
SET contrato_dispensado = true,
    contrato_dispensado_em = COALESCE(v.contrato_dispensado_em, now())
WHERE v.contrato_url IS NULL
  AND v.contrato_dispensado = false
  AND v.frete_aprovado = true
  AND EXISTS (SELECT 1 FROM public.produtos_vendas pv WHERE pv.venda_id = v.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.produtos_vendas pv
    WHERE pv.venda_id = v.id AND pv.faturamento IS DISTINCT FROM true
  );