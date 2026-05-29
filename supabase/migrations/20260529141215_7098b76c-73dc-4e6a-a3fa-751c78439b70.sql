CREATE TABLE public.vendas_config_lucro (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL UNIQUE,
  modo TEXT NOT NULL DEFAULT 'estatico',
  percentual_custo NUMERIC(5,2) NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT vendas_config_lucro_tipo_check CHECK (tipo IN ('instalacao','pintura_epoxi')),
  CONSTRAINT vendas_config_lucro_modo_check CHECK (modo IN ('estatico')),
  CONSTRAINT vendas_config_lucro_pct_check CHECK (percentual_custo >= 0 AND percentual_custo <= 100)
);

GRANT SELECT, INSERT, UPDATE ON public.vendas_config_lucro TO authenticated;
GRANT ALL ON public.vendas_config_lucro TO service_role;

ALTER TABLE public.vendas_config_lucro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read config lucro"
ON public.vendas_config_lucro FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert config lucro"
ON public.vendas_config_lucro FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update config lucro"
ON public.vendas_config_lucro FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.vendas_config_lucro (tipo, modo, percentual_custo) VALUES
  ('instalacao', 'estatico', 60),
  ('pintura_epoxi', 'estatico', 60)
ON CONFLICT (tipo) DO NOTHING;