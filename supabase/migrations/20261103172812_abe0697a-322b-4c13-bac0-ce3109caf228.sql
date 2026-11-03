CREATE TABLE public.comissoes_acordos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT NOT NULL DEFAULT 'acordos' UNIQUE,
  conteudo TEXT NOT NULL DEFAULT '',
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.comissoes_acordos TO authenticated;
GRANT ALL ON public.comissoes_acordos TO service_role;

ALTER TABLE public.comissoes_acordos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios logados podem ver acordos de comissoes"
  ON public.comissoes_acordos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios logados podem criar acordos de comissoes"
  ON public.comissoes_acordos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios logados podem editar acordos de comissoes"
  ON public.comissoes_acordos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_comissoes_acordos_updated_at
  BEFORE UPDATE ON public.comissoes_acordos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.comissoes_acordos (chave, conteudo) VALUES ('acordos', '')
ON CONFLICT (chave) DO NOTHING;