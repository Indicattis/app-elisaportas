CREATE TABLE public.contratos_orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.contratos_templates(id) ON DELETE SET NULL,
  arquivo_url text NOT NULL,
  nome_arquivo text NOT NULL,
  tamanho_arquivo integer NOT NULL,
  observacoes text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos_orcamentos TO authenticated;
GRANT ALL ON public.contratos_orcamentos TO service_role;

ALTER TABLE public.contratos_orcamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atendente ou admin pode ver contratos do orcamento"
ON public.contratos_orcamentos FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'administrador'::user_role)
  OR EXISTS (SELECT 1 FROM public.orcamentos o WHERE o.id = contratos_orcamentos.orcamento_id AND o.atendente_id = auth.uid())
);

CREATE POLICY "Atendente ou admin pode inserir contratos do orcamento"
ON public.contratos_orcamentos FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'administrador'::user_role)
  OR EXISTS (SELECT 1 FROM public.orcamentos o WHERE o.id = contratos_orcamentos.orcamento_id AND o.atendente_id = auth.uid())
);

CREATE POLICY "Atendente ou admin pode atualizar contratos do orcamento"
ON public.contratos_orcamentos FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'administrador'::user_role)
  OR EXISTS (SELECT 1 FROM public.orcamentos o WHERE o.id = contratos_orcamentos.orcamento_id AND o.atendente_id = auth.uid())
);

CREATE POLICY "Atendente ou admin pode excluir contratos do orcamento"
ON public.contratos_orcamentos FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'administrador'::user_role)
  OR EXISTS (SELECT 1 FROM public.orcamentos o WHERE o.id = contratos_orcamentos.orcamento_id AND o.atendente_id = auth.uid())
);

CREATE TRIGGER update_contratos_orcamentos_updated_at
BEFORE UPDATE ON public.contratos_orcamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_contratos_orcamentos_orcamento_id ON public.contratos_orcamentos(orcamento_id);