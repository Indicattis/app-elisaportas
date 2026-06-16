CREATE TABLE public.marketing_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('stories','post','video')),
  descricao text NOT NULL,
  link text,
  duracao_minutos integer NOT NULL CHECK (duracao_minutos >= 0),
  data date NOT NULL DEFAULT current_date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_atividades TO authenticated;
GRANT ALL ON public.marketing_atividades TO service_role;

ALTER TABLE public.marketing_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view marketing atividades"
  ON public.marketing_atividades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert marketing atividades"
  ON public.marketing_atividades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update marketing atividades"
  ON public.marketing_atividades FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete marketing atividades"
  ON public.marketing_atividades FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_marketing_atividades_updated_at
  BEFORE UPDATE ON public.marketing_atividades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_marketing_atividades_data ON public.marketing_atividades (data DESC);