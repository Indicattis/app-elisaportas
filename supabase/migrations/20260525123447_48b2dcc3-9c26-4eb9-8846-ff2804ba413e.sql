
CREATE TABLE public.tabela_precos_montagem_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custo_item_id uuid NOT NULL REFERENCES public.custos_itens(id) ON DELETE CASCADE,
  quantidade numeric(12,3) NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (custo_item_id)
);

CREATE INDEX idx_tpmt_custo_item_id ON public.tabela_precos_montagem_template(custo_item_id);

ALTER TABLE public.tabela_precos_montagem_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tpmt"
ON public.tabela_precos_montagem_template FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert tpmt"
ON public.tabela_precos_montagem_template FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update tpmt"
ON public.tabela_precos_montagem_template FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete tpmt"
ON public.tabela_precos_montagem_template FOR DELETE
USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_tpmt_updated_at
BEFORE UPDATE ON public.tabela_precos_montagem_template
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.tabela_precos_montagem_template (custo_item_id, quantidade)
SELECT custo_item_id, quantidade
FROM public.tabela_precos_portas_montagem
WHERE kit_id = 'b5a6faef-105f-484b-a10f-42544ce84617'
ON CONFLICT (custo_item_id) DO NOTHING;
