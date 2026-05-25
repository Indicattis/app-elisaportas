CREATE TABLE public.estrategia_materias_primas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  custo_item_id UUID NOT NULL REFERENCES public.custos_itens(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  quantidade_item NUMERIC NOT NULL DEFAULT 0,
  custo_total NUMERIC NOT NULL DEFAULT 0,
  fornecedor TEXT,
  observacoes TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_estrategia_materias_primas_custo_item ON public.estrategia_materias_primas(custo_item_id);

ALTER TABLE public.estrategia_materias_primas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read estrategia mp" ON public.estrategia_materias_primas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert estrategia mp" ON public.estrategia_materias_primas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update estrategia mp" ON public.estrategia_materias_primas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete estrategia mp" ON public.estrategia_materias_primas FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_estrategia_materias_primas_updated_at
BEFORE UPDATE ON public.estrategia_materias_primas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();