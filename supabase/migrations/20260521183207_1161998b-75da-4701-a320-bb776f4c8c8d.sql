
CREATE TABLE public.caixa_elisa_planejamento_meses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes date NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.caixa_elisa_planejamento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_id uuid NOT NULL REFERENCES public.caixa_elisa_planejamento_meses(id) ON DELETE CASCADE,
  nome text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX ON public.caixa_elisa_planejamento_itens(mes_id);

ALTER TABLE public.caixa_elisa_planejamento_meses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_elisa_planejamento_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read meses" ON public.caixa_elisa_planejamento_meses FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write meses" ON public.caixa_elisa_planejamento_meses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update meses" ON public.caixa_elisa_planejamento_meses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete meses" ON public.caixa_elisa_planejamento_meses FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth read itens" ON public.caixa_elisa_planejamento_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write itens" ON public.caixa_elisa_planejamento_itens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update itens" ON public.caixa_elisa_planejamento_itens FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete itens" ON public.caixa_elisa_planejamento_itens FOR DELETE TO authenticated USING (true);
