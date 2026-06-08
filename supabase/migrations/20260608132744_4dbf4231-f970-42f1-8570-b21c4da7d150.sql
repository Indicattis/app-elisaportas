ALTER TABLE public.despesas_padrao
  ADD COLUMN IF NOT EXISTS hora_extra numeric NOT NULL DEFAULT 0;

ALTER TABLE public.despesas_mes_folha_override
  ADD COLUMN IF NOT EXISTS hora_extra numeric;