ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS acordo_autorizado_id uuid
  REFERENCES public.acordos_instalacao_autorizados(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_gastos_acordo_autorizado_id
  ON public.gastos(acordo_autorizado_id);