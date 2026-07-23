CREATE TABLE public.frete_por_porta_regiao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  regiao TEXT NOT NULL UNIQUE,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.frete_por_porta_regiao TO authenticated;
GRANT ALL ON public.frete_por_porta_regiao TO service_role;

ALTER TABLE public.frete_por_porta_regiao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read frete por porta"
  ON public.frete_por_porta_regiao FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage frete por porta"
  ON public.frete_por_porta_regiao FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER trg_frete_por_porta_updated_at
  BEFORE UPDATE ON public.frete_por_porta_regiao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.frete_por_porta_regiao (regiao, valor_unitario) VALUES
  ('Sul', 750),
  ('Sudeste', 1200),
  ('Centro-Oeste', 950),
  ('Nordeste', 1500),
  ('Norte', 1800)
ON CONFLICT (regiao) DO NOTHING;