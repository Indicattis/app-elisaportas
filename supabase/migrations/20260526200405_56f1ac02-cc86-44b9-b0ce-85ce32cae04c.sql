
CREATE TABLE public.despesas_padrao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('folha','fixa','variavel')),
  nome TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  salario NUMERIC NOT NULL DEFAULT 0,
  aux_combustivel NUMERIC NOT NULL DEFAULT 0,
  insalubridade_pct NUMERIC NOT NULL DEFAULT 0,
  fgts_pct NUMERIC NOT NULL DEFAULT 8,
  previsao_13_valor NUMERIC NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas_padrao TO authenticated;
GRANT ALL ON public.despesas_padrao TO service_role;

ALTER TABLE public.despesas_padrao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view despesas_padrao" ON public.despesas_padrao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert despesas_padrao" ON public.despesas_padrao FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update despesas_padrao" ON public.despesas_padrao FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete despesas_padrao" ON public.despesas_padrao FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_despesas_padrao_tipo ON public.despesas_padrao(tipo, ordem);

CREATE TRIGGER update_despesas_padrao_updated_at
  BEFORE UPDATE ON public.despesas_padrao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
