
CREATE TABLE public.visitas_tecnicas_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id uuid,
  acao text NOT NULL CHECK (acao IN ('criada','alterada','excluida','concluida','reagendada')),
  titulo text,
  data_visita date,
  data_anterior date,
  responsavel_nome text,
  cidade text,
  estado text,
  detalhes jsonb,
  usuario_id uuid,
  usuario_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.visitas_tecnicas_historico TO authenticated;
GRANT ALL ON public.visitas_tecnicas_historico TO service_role;

ALTER TABLE public.visitas_tecnicas_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read visitas historico"
  ON public.visitas_tecnicas_historico FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert visitas historico"
  ON public.visitas_tecnicas_historico FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE INDEX idx_visitas_historico_created_at ON public.visitas_tecnicas_historico (created_at DESC);
CREATE INDEX idx_visitas_historico_visita_id ON public.visitas_tecnicas_historico (visita_id);
