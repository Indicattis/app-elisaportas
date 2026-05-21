CREATE TABLE public.custos_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  categoria text,
  subcategoria text,
  unidade text,
  custo_unitario numeric(14,4) NOT NULL DEFAULT 0,
  preco_venda numeric(14,4) NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custos_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view custos_itens"
  ON public.custos_itens FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert custos_itens"
  ON public.custos_itens FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update custos_itens"
  ON public.custos_itens FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated can delete custos_itens"
  ON public.custos_itens FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER trg_custos_itens_updated_at
  BEFORE UPDATE ON public.custos_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed inicial: cópia única do estoque atual
INSERT INTO public.custos_itens (descricao, categoria, subcategoria, unidade, custo_unitario, preco_venda, ordem)
SELECT
  COALESCE(e.nome_produto, e.descricao_produto, 'Sem descrição'),
  e.categoria,
  s.nome,
  e.unidade,
  COALESCE(e.custo_unitario, 0),
  COALESCE(e.preco_venda, 0),
  COALESCE(e.ordem, 0)
FROM public.estoque e
LEFT JOIN public.estoque_subcategorias s ON s.id = e.subcategoria_id
WHERE COALESCE(e.ativo, true) = true;