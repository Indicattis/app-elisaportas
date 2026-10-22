ALTER TABLE public.contratos_vendas ADD COLUMN IF NOT EXISTS tipo_contrato text;
UPDATE public.contratos_vendas SET tipo_contrato = 'elisa' WHERE tipo_contrato IS NULL;