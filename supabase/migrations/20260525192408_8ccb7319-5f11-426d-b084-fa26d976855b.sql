
CREATE TABLE IF NOT EXISTS public.despesas_valor_pago_mensal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_custo_id uuid NOT NULL REFERENCES public.tipos_custos(id) ON DELETE CASCADE,
  mes_referencia date NOT NULL,
  valor_pago numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo_custo_id, mes_referencia)
);

ALTER TABLE public.despesas_valor_pago_mensal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read despesas_valor_pago_mensal"
ON public.despesas_valor_pago_mensal FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated can insert despesas_valor_pago_mensal"
ON public.despesas_valor_pago_mensal FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update despesas_valor_pago_mensal"
ON public.despesas_valor_pago_mensal FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete despesas_valor_pago_mensal"
ON public.despesas_valor_pago_mensal FOR DELETE
TO authenticated USING (true);

CREATE TRIGGER update_despesas_valor_pago_mensal_updated_at
BEFORE UPDATE ON public.despesas_valor_pago_mensal
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
