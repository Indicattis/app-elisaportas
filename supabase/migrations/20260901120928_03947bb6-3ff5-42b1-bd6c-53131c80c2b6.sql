CREATE TABLE public.colaborador_fichas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL UNIQUE REFERENCES public.admin_users(id) ON DELETE CASCADE,
  comida_favorita text,
  bebida_favorita text,
  preferencia_bebida text,
  preferencia_bebida_outra text,
  doce_favorito text,
  doce_ou_salgado text,
  cor_favorita text,
  sexo text,
  estado_civil text,
  nacionalidade text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaborador_fichas TO authenticated;
GRANT ALL ON public.colaborador_fichas TO service_role;

ALTER TABLE public.colaborador_fichas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver fichas" ON public.colaborador_fichas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem criar fichas" ON public.colaborador_fichas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem editar fichas" ON public.colaborador_fichas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados podem excluir fichas" ON public.colaborador_fichas FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_colaborador_fichas_updated_at
BEFORE UPDATE ON public.colaborador_fichas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();