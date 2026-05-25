CREATE TABLE public.despesas_mes_status (
  mes_referencia DATE PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pronto')),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.despesas_mes_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated select despesas_mes_status"
ON public.despesas_mes_status FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated insert despesas_mes_status"
ON public.despesas_mes_status FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated update despesas_mes_status"
ON public.despesas_mes_status FOR UPDATE TO authenticated USING (true) WITH CHECK (true);