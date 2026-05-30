ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS tipo_frete text NOT NULL DEFAULT 'interno';

ALTER TABLE public.vendas
  DROP CONSTRAINT IF EXISTS vendas_tipo_frete_check;

ALTER TABLE public.vendas
  ADD CONSTRAINT vendas_tipo_frete_check
  CHECK (tipo_frete IN ('interno','transportadora'));