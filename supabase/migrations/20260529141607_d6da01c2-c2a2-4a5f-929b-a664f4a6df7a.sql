ALTER TABLE public.vendas_config_lucro
  ADD COLUMN IF NOT EXISTS parametros JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.vendas_config_lucro
  DROP CONSTRAINT IF EXISTS vendas_config_lucro_modo_check;

ALTER TABLE public.vendas_config_lucro
  ADD CONSTRAINT vendas_config_lucro_modo_check
  CHECK (modo IN ('estatico','formula_dimensao'));