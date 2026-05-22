
-- Migrar dados existentes
UPDATE public.multas SET status = 'aberta' WHERE status = 'pendente';

-- Novo default
ALTER TABLE public.multas ALTER COLUMN status SET DEFAULT 'aberta';

-- Tabela de responsáveis por etapa de multa
CREATE TABLE public.multas_etapa_responsaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL UNIQUE,
  responsavel_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT multas_etapa_responsaveis_status_check
    CHECK (status IN ('aberta','advertida','paga','concluida'))
);

ALTER TABLE public.multas_etapa_responsaveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view multas etapa responsaveis"
  ON public.multas_etapa_responsaveis FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert multas etapa responsaveis"
  ON public.multas_etapa_responsaveis FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update multas etapa responsaveis"
  ON public.multas_etapa_responsaveis FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete multas etapa responsaveis"
  ON public.multas_etapa_responsaveis FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_multas_etapa_responsaveis_updated_at
  BEFORE UPDATE ON public.multas_etapa_responsaveis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
