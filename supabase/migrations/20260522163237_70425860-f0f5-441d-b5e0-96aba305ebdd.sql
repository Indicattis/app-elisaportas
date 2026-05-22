
CREATE TABLE public.tabela_precos_portas_montagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.tabela_precos_portas(id) ON DELETE CASCADE,
  custo_item_id uuid NOT NULL REFERENCES public.custos_itens(id) ON DELETE CASCADE,
  quantidade numeric(12,3) NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kit_id, custo_item_id)
);

CREATE INDEX idx_tppm_kit_id ON public.tabela_precos_portas_montagem(kit_id);
CREATE INDEX idx_tppm_custo_item_id ON public.tabela_precos_portas_montagem(custo_item_id);

ALTER TABLE public.tabela_precos_portas_montagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tppm"
ON public.tabela_precos_portas_montagem FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert tppm"
ON public.tabela_precos_portas_montagem FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update tppm"
ON public.tabela_precos_portas_montagem FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete tppm"
ON public.tabela_precos_portas_montagem FOR DELETE
USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_tppm_updated_at
BEFORE UPDATE ON public.tabela_precos_portas_montagem
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
