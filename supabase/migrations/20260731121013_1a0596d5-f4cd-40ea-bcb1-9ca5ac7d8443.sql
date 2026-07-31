ALTER TABLE public.visitas_tecnicas_agendadas
  ADD COLUMN IF NOT EXISTS responsavel_tipo text NOT NULL DEFAULT 'colaborador';

ALTER TABLE public.visitas_tecnicas_agendadas
  ADD CONSTRAINT visitas_tecnicas_agendadas_responsavel_tipo_check
  CHECK (responsavel_tipo IN ('colaborador', 'autorizado'));