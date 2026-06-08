
CREATE TABLE public.passos_evolucao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  concluido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.passos_evolucao TO authenticated;
GRANT ALL ON public.passos_evolucao TO service_role;

ALTER TABLE public.passos_evolucao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage passos_evolucao"
ON public.passos_evolucao FOR ALL
TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER update_passos_evolucao_updated_at
BEFORE UPDATE ON public.passos_evolucao
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
