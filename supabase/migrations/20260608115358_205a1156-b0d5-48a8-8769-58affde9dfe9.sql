CREATE TABLE public.regras_setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regras_setores TO authenticated;
GRANT SELECT ON public.regras_setores TO anon;
GRANT ALL ON public.regras_setores TO service_role;
ALTER TABLE public.regras_setores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read regras_setores" ON public.regras_setores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert regras_setores" ON public.regras_setores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update regras_setores" ON public.regras_setores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete regras_setores" ON public.regras_setores FOR DELETE TO authenticated USING (true);

CREATE TABLE public.regras_setor_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id UUID NOT NULL REFERENCES public.regras_setores(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regras_setor_itens TO authenticated;
GRANT SELECT ON public.regras_setor_itens TO anon;
GRANT ALL ON public.regras_setor_itens TO service_role;
ALTER TABLE public.regras_setor_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read regras_setor_itens" ON public.regras_setor_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert regras_setor_itens" ON public.regras_setor_itens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update regras_setor_itens" ON public.regras_setor_itens FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete regras_setor_itens" ON public.regras_setor_itens FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_regras_setores_updated BEFORE UPDATE ON public.regras_setores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_regras_setor_itens_updated BEFORE UPDATE ON public.regras_setor_itens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_regras_setor_itens_setor ON public.regras_setor_itens(setor_id);