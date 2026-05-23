CREATE TABLE public.dre_realizados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes date NOT NULL UNIQUE,
  faturamento_total numeric NOT NULL DEFAULT 0,
  lucro_bruto numeric NOT NULL DEFAULT 0,
  total_despesas_fixas numeric NOT NULL DEFAULT 0,
  total_despesas_folha numeric NOT NULL DEFAULT 0,
  total_despesas_variaveis numeric NOT NULL DEFAULT 0,
  lucro_liquido_final numeric NOT NULL DEFAULT 0,
  perc_bruto numeric NOT NULL DEFAULT 0,
  perc_liquido numeric NOT NULL DEFAULT 0,
  observacoes text,
  realizado_por uuid,
  realizado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dre_realizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage dre_realizados"
ON public.dre_realizados
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE TRIGGER update_dre_realizados_updated_at
BEFORE UPDATE ON public.dre_realizados
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();