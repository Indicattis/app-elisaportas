CREATE TABLE public.autorizados_meta_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_por_cidade NUMERIC NOT NULL DEFAULT 1,
  total_cidades_brasil INTEGER NOT NULL DEFAULT 5570,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.autorizados_meta_config TO authenticated;
GRANT ALL ON public.autorizados_meta_config TO service_role;

ALTER TABLE public.autorizados_meta_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read config" ON public.autorizados_meta_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert config" ON public.autorizados_meta_config
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update config" ON public.autorizados_meta_config
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.autorizados_meta_config (meta_por_cidade, total_cidades_brasil) VALUES (1, 5570);