CREATE TABLE public.despesas_secao_teto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  secao_key TEXT NOT NULL,
  mes_referencia DATE,
  valor_teto NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX despesas_secao_teto_key_mes_uidx
  ON public.despesas_secao_teto (secao_key, COALESCE(mes_referencia, '1900-01-01'::date));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas_secao_teto TO authenticated;
GRANT ALL ON public.despesas_secao_teto TO service_role;

ALTER TABLE public.despesas_secao_teto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view secao teto"
  ON public.despesas_secao_teto FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert secao teto"
  ON public.despesas_secao_teto FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update secao teto"
  ON public.despesas_secao_teto FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete secao teto"
  ON public.despesas_secao_teto FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER update_despesas_secao_teto_updated_at
  BEFORE UPDATE ON public.despesas_secao_teto
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();