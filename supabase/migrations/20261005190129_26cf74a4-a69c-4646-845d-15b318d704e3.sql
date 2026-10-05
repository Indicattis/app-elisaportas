CREATE TABLE public.pos_vendas_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos_producao(id) ON DELETE CASCADE,
  tentativa smallint NOT NULL CHECK (tentativa BETWEEN 1 AND 3),
  realizado_por uuid DEFAULT auth.uid(),
  realizado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pedido_id, tentativa)
);
GRANT SELECT, INSERT, DELETE ON public.pos_vendas_followups TO authenticated;
GRANT ALL ON public.pos_vendas_followups TO service_role;
ALTER TABLE public.pos_vendas_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read followups" ON public.pos_vendas_followups FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert followups" ON public.pos_vendas_followups FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth delete followups" ON public.pos_vendas_followups FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);