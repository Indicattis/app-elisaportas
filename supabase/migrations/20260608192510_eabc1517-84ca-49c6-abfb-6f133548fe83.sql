
CREATE TABLE public.visitas_tecnicas_agendadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  data_visita date NOT NULL,
  hora_inicio time NOT NULL,
  responsavel_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  telefone_contato text,
  cep text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  observacoes text,
  status text NOT NULL DEFAULT 'agendada',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitas_tecnicas_agendadas TO authenticated;
GRANT ALL ON public.visitas_tecnicas_agendadas TO service_role;

ALTER TABLE public.visitas_tecnicas_agendadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view visitas agendadas"
  ON public.visitas_tecnicas_agendadas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert visitas agendadas"
  ON public.visitas_tecnicas_agendadas FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update visitas agendadas"
  ON public.visitas_tecnicas_agendadas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete visitas agendadas"
  ON public.visitas_tecnicas_agendadas FOR DELETE TO authenticated USING (true);

CREATE TRIGGER visitas_tecnicas_agendadas_updated_at
  BEFORE UPDATE ON public.visitas_tecnicas_agendadas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_visitas_agendadas_data ON public.visitas_tecnicas_agendadas(data_visita);
