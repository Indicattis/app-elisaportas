ALTER TABLE public.estoque
  ADD COLUMN IF NOT EXISTS qtd_modo_calculo text NOT NULL DEFAULT 'formula',
  ADD COLUMN IF NOT EXISTS qtd_porta_p integer,
  ADD COLUMN IF NOT EXISTS qtd_porta_g integer,
  ADD COLUMN IF NOT EXISTS qtd_porta_gg integer;

ALTER TABLE public.estoque
  DROP CONSTRAINT IF EXISTS estoque_qtd_modo_calculo_check;

ALTER TABLE public.estoque
  ADD CONSTRAINT estoque_qtd_modo_calculo_check
  CHECK (qtd_modo_calculo IN ('formula', 'por_tamanho'));