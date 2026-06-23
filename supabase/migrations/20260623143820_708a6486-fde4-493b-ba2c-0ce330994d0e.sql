CREATE TABLE IF NOT EXISTS public.entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL,
  descricao text NULL,
  valor numeric NOT NULL,
  data date NOT NULL,
  responsavel_id uuid NULL,
  banco_id uuid NULL REFERENCES public.bancos(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'recebido',
  observacoes text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entradas TO authenticated;
GRANT ALL ON public.entradas TO service_role;

ALTER TABLE public.entradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage entradas"
  ON public.entradas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_entradas_data ON public.entradas(data);
CREATE INDEX IF NOT EXISTS idx_entradas_responsavel ON public.entradas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_entradas_banco ON public.entradas(banco_id);

CREATE TRIGGER trg_entradas_updated_at
  BEFORE UPDATE ON public.entradas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_routes (key, path, label, parent_key, sort_order, interface, active)
VALUES ('admin_entradas', '/financeiro/entradas', 'Entradas', 'administrativo_hub', 425, 'padrao', true)
ON CONFLICT (key) DO NOTHING;