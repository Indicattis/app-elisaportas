CREATE TABLE IF NOT EXISTS public.venda_comprovantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  url text NOT NULL,
  nome text NOT NULL,
  content_type text,
  tamanho_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS venda_comprovantes_venda_id_idx ON public.venda_comprovantes(venda_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venda_comprovantes TO authenticated;
GRANT ALL ON public.venda_comprovantes TO service_role;

ALTER TABLE public.venda_comprovantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view venda comprovantes"
  ON public.venda_comprovantes FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_comprovantes.venda_id));

CREATE POLICY "Authenticated users can insert venda comprovantes"
  ON public.venda_comprovantes FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_comprovantes.venda_id));

CREATE POLICY "Authenticated users can update venda comprovantes"
  ON public.venda_comprovantes FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_comprovantes.venda_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_comprovantes.venda_id));

CREATE POLICY "Authenticated users can delete venda comprovantes"
  ON public.venda_comprovantes FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_comprovantes.venda_id));

CREATE TRIGGER trg_venda_comprovantes_updated_at
  BEFORE UPDATE ON public.venda_comprovantes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();