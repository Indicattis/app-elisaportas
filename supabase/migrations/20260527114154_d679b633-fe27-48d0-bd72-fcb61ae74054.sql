CREATE TABLE public.despesas_status_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_referencia DATE NOT NULL,
  escopo TEXT NOT NULL CHECK (escopo IN ('mes','folha','lanc')),
  ref_id UUID,
  ref_nome TEXT NOT NULL,
  status_anterior TEXT NOT NULL CHECK (status_anterior IN ('pendente','alana','luan')),
  status_novo TEXT NOT NULL CHECK (status_novo IN ('pendente','alana','luan')),
  changed_by UUID,
  changed_by_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_despesas_status_historico_mes ON public.despesas_status_historico (mes_referencia, created_at DESC);

GRANT SELECT, INSERT ON public.despesas_status_historico TO authenticated;
GRANT ALL ON public.despesas_status_historico TO service_role;

ALTER TABLE public.despesas_status_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view status history"
ON public.despesas_status_historico
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert own status history"
ON public.despesas_status_historico
FOR INSERT
TO authenticated
WITH CHECK (changed_by = auth.uid());