
CREATE TABLE public.despesas_manuais_folha (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_referencia DATE NOT NULL,
  admin_user_id UUID NOT NULL,
  colaborador_nome TEXT NOT NULL,
  salario NUMERIC NOT NULL DEFAULT 0,
  aux_combustivel NUMERIC NOT NULL DEFAULT 0,
  insalubridade_pct NUMERIC NOT NULL DEFAULT 0,
  fgts_pct NUMERIC NOT NULL DEFAULT 8,
  previsao_13_valor NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_despesas_manuais_folha_mes ON public.despesas_manuais_folha(mes_referencia);

ALTER TABLE public.despesas_manuais_folha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view despesas_manuais_folha"
  ON public.despesas_manuais_folha FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert despesas_manuais_folha"
  ON public.despesas_manuais_folha FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update despesas_manuais_folha"
  ON public.despesas_manuais_folha FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete despesas_manuais_folha"
  ON public.despesas_manuais_folha FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_despesas_manuais_folha_updated_at
  BEFORE UPDATE ON public.despesas_manuais_folha
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.despesas_manuais_lancamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_referencia DATE NOT NULL,
  tipo_custo_id UUID,
  categoria TEXT NOT NULL CHECK (categoria IN ('fixa','variavel')),
  tipo_nome TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  data DATE NOT NULL,
  descricao TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_despesas_manuais_lancamentos_mes ON public.despesas_manuais_lancamentos(mes_referencia);

ALTER TABLE public.despesas_manuais_lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view despesas_manuais_lancamentos"
  ON public.despesas_manuais_lancamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert despesas_manuais_lancamentos"
  ON public.despesas_manuais_lancamentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update despesas_manuais_lancamentos"
  ON public.despesas_manuais_lancamentos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete despesas_manuais_lancamentos"
  ON public.despesas_manuais_lancamentos FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_despesas_manuais_lancamentos_updated_at
  BEFORE UPDATE ON public.despesas_manuais_lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
