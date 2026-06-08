-- 1) Update CHECK constraint on tipos_custos.tipo to include 'salario'
ALTER TABLE public.tipos_custos DROP CONSTRAINT IF EXISTS tipos_custos_tipo_check;
ALTER TABLE public.tipos_custos ADD CONSTRAINT tipos_custos_tipo_check
  CHECK (tipo IN ('fixa','variavel','imposto','projetada','investimento','fornecedor','financiamento','frete','autorizado','salario'));

-- 2) Create per-category DRE config table
CREATE TABLE IF NOT EXISTS public.despesas_categoria_dre_config (
  categoria text PRIMARY KEY,
  debita_dre boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas_categoria_dre_config TO authenticated;
GRANT ALL ON public.despesas_categoria_dre_config TO service_role;

ALTER TABLE public.despesas_categoria_dre_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read dre config"
  ON public.despesas_categoria_dre_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can upsert dre config"
  ON public.despesas_categoria_dre_config FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update dre config"
  ON public.despesas_categoria_dre_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_despesas_categoria_dre_config_updated_at
  BEFORE UPDATE ON public.despesas_categoria_dre_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default rows (debita_dre = true) for all known categories
INSERT INTO public.despesas_categoria_dre_config (categoria, debita_dre) VALUES
  ('fixa', true),
  ('variavel', true),
  ('imposto', true),
  ('projetada', true),
  ('investimento', true),
  ('fornecedor', true),
  ('financiamento', true),
  ('frete', true),
  ('autorizado', true),
  ('salario', true)
ON CONFLICT (categoria) DO NOTHING;