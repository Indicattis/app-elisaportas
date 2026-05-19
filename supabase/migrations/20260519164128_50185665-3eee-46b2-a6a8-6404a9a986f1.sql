CREATE TABLE public.custos_folha_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_referencia date NOT NULL,
  colaborador_id uuid NOT NULL,
  colaborador_nome text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mes_referencia, colaborador_id)
);

ALTER TABLE public.custos_folha_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage custos_folha_mensais"
ON public.custos_folha_mensais
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE TRIGGER update_custos_folha_mensais_updated_at
BEFORE UPDATE ON public.custos_folha_mensais
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_custos_folha_mensais_mes ON public.custos_folha_mensais (mes_referencia);