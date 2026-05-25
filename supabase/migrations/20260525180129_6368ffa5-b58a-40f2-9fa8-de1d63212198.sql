ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS aux_combustivel numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insalubridade_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fgts_pct numeric NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS previsao_13_valor numeric NOT NULL DEFAULT 0;