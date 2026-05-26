ALTER TABLE public.despesas_manuais_folha
  ADD COLUMN IF NOT EXISTS confirmado_por text NOT NULL DEFAULT 'alana';

ALTER TABLE public.despesas_manuais_folha
  DROP CONSTRAINT IF EXISTS despesas_manuais_folha_confirmado_por_check;
ALTER TABLE public.despesas_manuais_folha
  ADD CONSTRAINT despesas_manuais_folha_confirmado_por_check
  CHECK (confirmado_por IN ('alana','luan'));

ALTER TABLE public.despesas_manuais_lancamentos
  ADD COLUMN IF NOT EXISTS confirmado_por text NOT NULL DEFAULT 'alana';

ALTER TABLE public.despesas_manuais_lancamentos
  DROP CONSTRAINT IF EXISTS despesas_manuais_lancamentos_confirmado_por_check;
ALTER TABLE public.despesas_manuais_lancamentos
  ADD CONSTRAINT despesas_manuais_lancamentos_confirmado_por_check
  CHECK (confirmado_por IN ('alana','luan'));