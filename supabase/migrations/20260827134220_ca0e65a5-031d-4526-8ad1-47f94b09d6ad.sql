CREATE TABLE public.processos_justica (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo TEXT NOT NULL DEFAULT 'trabalhista',
  nome TEXT NOT NULL,
  acordo_sugerido_valor NUMERIC,
  acordo_sugerido_texto TEXT,
  acordo_proposto_valor NUMERIC,
  sem_acordo BOOLEAN NOT NULL DEFAULT false,
  valor_final NUMERIC,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.processos_justica TO authenticated;
GRANT ALL ON public.processos_justica TO service_role;

ALTER TABLE public.processos_justica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam processos"
ON public.processos_justica FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TABLE public.processos_justica_atualizacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id UUID NOT NULL REFERENCES public.processos_justica(id) ON DELETE CASCADE,
  comentario TEXT NOT NULL,
  autor_id UUID,
  autor_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.processos_justica_atualizacoes TO authenticated;
GRANT ALL ON public.processos_justica_atualizacoes TO service_role;

ALTER TABLE public.processos_justica_atualizacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam atualizacoes de processos"
ON public.processos_justica_atualizacoes FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE INDEX idx_processos_justica_atualizacoes_processo ON public.processos_justica_atualizacoes(processo_id);

CREATE TRIGGER update_processos_justica_updated_at
BEFORE UPDATE ON public.processos_justica
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();