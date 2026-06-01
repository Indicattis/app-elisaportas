
CREATE TABLE public.despesas_mes_folha_override (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_referencia date NOT NULL,
  despesa_padrao_id uuid NOT NULL REFERENCES public.despesas_padrao(id) ON DELETE CASCADE,
  salario numeric,
  salario_minimo numeric,
  aux_combustivel numeric,
  insalubridade_pct numeric,
  fgts_pct numeric,
  previsao_13_valor numeric,
  ferias_valor numeric,
  em_folha boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (mes_referencia, despesa_padrao_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas_mes_folha_override TO authenticated;
GRANT ALL ON public.despesas_mes_folha_override TO service_role;

ALTER TABLE public.despesas_mes_folha_override ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read folha override"
ON public.despesas_mes_folha_override FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated write folha override"
ON public.despesas_mes_folha_override FOR ALL
TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_despesas_mes_folha_override_updated_at
BEFORE UPDATE ON public.despesas_mes_folha_override
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.despesas_mes_tipo_custo_override (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_referencia date NOT NULL,
  tipo_custo_id uuid NOT NULL REFERENCES public.tipos_custos(id) ON DELETE CASCADE,
  valor_maximo_mensal numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (mes_referencia, tipo_custo_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas_mes_tipo_custo_override TO authenticated;
GRANT ALL ON public.despesas_mes_tipo_custo_override TO service_role;

ALTER TABLE public.despesas_mes_tipo_custo_override ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read tipo custo override"
ON public.despesas_mes_tipo_custo_override FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated write tipo custo override"
ON public.despesas_mes_tipo_custo_override FOR ALL
TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_despesas_mes_tipo_custo_override_updated_at
BEFORE UPDATE ON public.despesas_mes_tipo_custo_override
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
