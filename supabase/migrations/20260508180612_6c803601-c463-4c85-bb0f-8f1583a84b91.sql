
-- Tabela de matérias-primas (insumos comprados)
CREATE TABLE public.materias_primas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'un',
  quantidade NUMERIC NOT NULL DEFAULT 0,
  custo_unitario NUMERIC NOT NULL DEFAULT 0,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.materias_primas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view materias_primas"
  ON public.materias_primas FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert materias_primas"
  ON public.materias_primas FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update materias_primas"
  ON public.materias_primas FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete materias_primas"
  ON public.materias_primas FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_materias_primas_updated_at
  BEFORE UPDATE ON public.materias_primas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Vínculo no estoque (1 item -> 1 matéria-prima)
ALTER TABLE public.estoque
  ADD COLUMN materia_prima_id UUID REFERENCES public.materias_primas(id) ON DELETE SET NULL,
  ADD COLUMN materia_prima_conversao NUMERIC;

CREATE INDEX idx_estoque_materia_prima_id ON public.estoque(materia_prima_id);
