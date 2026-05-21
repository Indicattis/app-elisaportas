CREATE TABLE public.custos_itens_categorias_ordem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL UNIQUE,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custos_itens_categorias_ordem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read cat ordem" ON public.custos_itens_categorias_ordem FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert cat ordem" ON public.custos_itens_categorias_ordem FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update cat ordem" ON public.custos_itens_categorias_ordem FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete cat ordem" ON public.custos_itens_categorias_ordem FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_custos_itens_categorias_ordem_updated_at
BEFORE UPDATE ON public.custos_itens_categorias_ordem
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();