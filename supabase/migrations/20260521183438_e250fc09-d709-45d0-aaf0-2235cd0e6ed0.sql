
ALTER TABLE public.custos_folha_mensais
  ADD COLUMN IF NOT EXISTS bonus numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pensao_alimenticia numeric NOT NULL DEFAULT 0;
