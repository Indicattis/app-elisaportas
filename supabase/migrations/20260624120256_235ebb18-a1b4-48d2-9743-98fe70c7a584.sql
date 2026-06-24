ALTER TABLE public.visitas_tecnicas_agendadas
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'visita_tecnica';

ALTER TABLE public.visitas_tecnicas_agendadas
  DROP CONSTRAINT IF EXISTS visitas_tecnicas_agendadas_tipo_check;

ALTER TABLE public.visitas_tecnicas_agendadas
  ADD CONSTRAINT visitas_tecnicas_agendadas_tipo_check
  CHECK (tipo IN ('visita_tecnica','manutencao'));