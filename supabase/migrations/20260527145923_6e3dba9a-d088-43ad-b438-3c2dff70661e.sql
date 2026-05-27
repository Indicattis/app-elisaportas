ALTER TABLE public.dre_realizados
  ADD COLUMN IF NOT EXISTS total_despesas_imposto numeric NOT NULL DEFAULT 0;