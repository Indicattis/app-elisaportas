ALTER TABLE public.custos_folha_mensais
  ADD COLUMN IF NOT EXISTS salario_base numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ajuda_custo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horas_extras numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chave_pix text;

UPDATE public.custos_folha_mensais
SET salario_base = valor
WHERE salario_base = 0 AND valor > 0;