ALTER TABLE public.visitas_tecnicas_agendadas
  ADD COLUMN IF NOT EXISTS capturada_por UUID,
  ADD COLUMN IF NOT EXISTS capturada_em TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.visitas_tecnicas_agendadas.capturada_por IS 'Usuário autenticado que iniciou a medição e capturou a visita';
COMMENT ON COLUMN public.visitas_tecnicas_agendadas.capturada_em IS 'Data e hora em que a visita foi capturada para medição';

CREATE INDEX IF NOT EXISTS idx_visitas_tecnicas_agendadas_capturada_por
  ON public.visitas_tecnicas_agendadas(capturada_por);