CREATE TABLE public.custos_itens_padroes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  taxa_impostos numeric NOT NULL DEFAULT 0,
  taxa_descontos numeric NOT NULL DEFAULT 0,
  taxa_cartao numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custos_itens_padroes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read padroes" ON public.custos_itens_padroes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert padroes" ON public.custos_itens_padroes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update padroes" ON public.custos_itens_padroes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_custos_itens_padroes_updated_at
BEFORE UPDATE ON public.custos_itens_padroes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.custos_itens_padroes (singleton) VALUES (true) ON CONFLICT DO NOTHING;