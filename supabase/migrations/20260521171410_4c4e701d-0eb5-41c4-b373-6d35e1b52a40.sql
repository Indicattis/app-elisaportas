-- Drop old tables (cascade removes any dependencies)
DROP TABLE IF EXISTS public.caixa_roboost_entradas CASCADE;
DROP TABLE IF EXISTS public.caixa_roboost_etiquetas CASCADE;

-- Config singleton
CREATE TABLE public.caixa_elisa_config (
  id text PRIMARY KEY DEFAULT 'singleton' CHECK (id = 'singleton'),
  capital_giro numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.caixa_elisa_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage caixa_elisa_config"
ON public.caixa_elisa_config
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE TRIGGER update_caixa_elisa_config_updated_at
BEFORE UPDATE ON public.caixa_elisa_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed singleton
INSERT INTO public.caixa_elisa_config (id, capital_giro)
VALUES ('singleton', 0)
ON CONFLICT (id) DO NOTHING;

-- Obrigacoes
CREATE TABLE public.caixa_elisa_obrigacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  data date NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  pago boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.caixa_elisa_obrigacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage caixa_elisa_obrigacoes"
ON public.caixa_elisa_obrigacoes
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE TRIGGER update_caixa_elisa_obrigacoes_updated_at
BEFORE UPDATE ON public.caixa_elisa_obrigacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_caixa_elisa_obrigacoes_data ON public.caixa_elisa_obrigacoes(data);