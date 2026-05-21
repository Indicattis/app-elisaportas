
ALTER TABLE public.caixa_elisa_planejamento_itens
  ADD COLUMN IF NOT EXISTS data date,
  ADD COLUMN IF NOT EXISTS pago boolean NOT NULL DEFAULT false;
