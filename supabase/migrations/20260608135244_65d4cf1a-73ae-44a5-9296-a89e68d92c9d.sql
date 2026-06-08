
CREATE TABLE public.pintura_trocas_gas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  valor numeric NOT NULL DEFAULT 0,
  observacoes text,
  registrado_por uuid,
  registrado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pintura_trocas_gas TO authenticated;
GRANT SELECT ON public.pintura_trocas_gas TO anon;
GRANT ALL ON public.pintura_trocas_gas TO service_role;

ALTER TABLE public.pintura_trocas_gas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read trocas gas"
  ON public.pintura_trocas_gas FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated can insert trocas gas"
  ON public.pintura_trocas_gas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update trocas gas"
  ON public.pintura_trocas_gas FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can delete trocas gas"
  ON public.pintura_trocas_gas FOR DELETE
  TO authenticated
  USING (true);

CREATE TRIGGER update_pintura_trocas_gas_updated_at
  BEFORE UPDATE ON public.pintura_trocas_gas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
