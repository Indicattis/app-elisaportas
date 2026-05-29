CREATE TABLE public.categorias_faturamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ordem int NOT NULL DEFAULT 0,
  tipos_produto text[] NOT NULL DEFAULT '{}',
  cor_hex text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.categorias_faturamento TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_faturamento TO authenticated;
GRANT ALL ON public.categorias_faturamento TO service_role;

ALTER TABLE public.categorias_faturamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias_faturamento_select" ON public.categorias_faturamento
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "categorias_faturamento_admin_all" ON public.categorias_faturamento
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER trg_categorias_faturamento_updated_at
  BEFORE UPDATE ON public.categorias_faturamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.categorias_faturamento (nome, ordem, tipos_produto, cor_hex) VALUES
  ('Portas',         1, ARRAY['porta','porta_enrolar','porta_social'], '#60a5fa'),
  ('Pintura',        2, ARRAY['pintura_epoxi'],                        '#fb923c'),
  ('Instalações',    3, ARRAY['instalacao'],                           '#22d3ee'),
  ('Itens Avulsos',  4, ARRAY['acessorio','adicional','manutencao'],   '#34d399');