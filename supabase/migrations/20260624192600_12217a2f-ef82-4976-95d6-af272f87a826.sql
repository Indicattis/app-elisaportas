
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS contrato_liberado_faturamento boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contrato_liberado_em timestamptz,
  ADD COLUMN IF NOT EXISTS contrato_liberado_por uuid;

-- Backfill: vendas existentes que já tinham contrato anexado ou dispensado entram como liberadas
UPDATE public.vendas
SET contrato_liberado_faturamento = true,
    contrato_liberado_em = COALESCE(contrato_assinado_em, contrato_dispensado_em, now())
WHERE contrato_liberado_faturamento = false
  AND (contrato_url IS NOT NULL OR contrato_dispensado = true);
