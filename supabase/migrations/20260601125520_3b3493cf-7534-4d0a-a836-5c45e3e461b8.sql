-- Tabela mestre: autorizados terceiros
CREATE TABLE public.autorizados_terceiros (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  cidade text NOT NULL,
  estado text NOT NULL,
  quilometragem numeric,
  valor_estipulado numeric NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.autorizados_terceiros TO authenticated;
GRANT ALL ON public.autorizados_terceiros TO service_role;

ALTER TABLE public.autorizados_terceiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler autorizados terceiros"
  ON public.autorizados_terceiros FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem inserir autorizados terceiros"
  ON public.autorizados_terceiros FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar autorizados terceiros"
  ON public.autorizados_terceiros FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Autenticados podem remover autorizados terceiros"
  ON public.autorizados_terceiros FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_autorizados_terceiros_updated_at
  BEFORE UPDATE ON public.autorizados_terceiros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pagamentos por mês
CREATE TABLE public.pagamentos_autorizados_terceiros_mes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  autorizado_id uuid NOT NULL REFERENCES public.autorizados_terceiros(id) ON DELETE CASCADE,
  mes_referencia date NOT NULL,
  valor_pago numeric NOT NULL DEFAULT 0,
  pago_em date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (autorizado_id, mes_referencia)
);

CREATE INDEX idx_pagamentos_autorizados_terceiros_mes_ref
  ON public.pagamentos_autorizados_terceiros_mes(mes_referencia);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos_autorizados_terceiros_mes TO authenticated;
GRANT ALL ON public.pagamentos_autorizados_terceiros_mes TO service_role;

ALTER TABLE public.pagamentos_autorizados_terceiros_mes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler pagamentos terceiros mes"
  ON public.pagamentos_autorizados_terceiros_mes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem inserir pagamentos terceiros mes"
  ON public.pagamentos_autorizados_terceiros_mes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar pagamentos terceiros mes"
  ON public.pagamentos_autorizados_terceiros_mes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Autenticados podem remover pagamentos terceiros mes"
  ON public.pagamentos_autorizados_terceiros_mes FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_pagamentos_autorizados_terceiros_mes_updated_at
  BEFORE UPDATE ON public.pagamentos_autorizados_terceiros_mes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();