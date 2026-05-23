
CREATE TABLE public.marketing_videos_ideias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  criado_por UUID,
  criado_por_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT titulo_nao_vazio CHECK (char_length(trim(titulo)) > 0),
  CONSTRAINT descricao_min_60 CHECK (char_length(descricao) >= 60)
);

ALTER TABLE public.marketing_videos_ideias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver ideias de videos"
ON public.marketing_videos_ideias FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Autenticados podem criar ideias de videos"
ON public.marketing_videos_ideias FOR INSERT
TO authenticated WITH CHECK (auth.uid() = criado_por);

CREATE POLICY "Autor ou admin pode atualizar ideias de videos"
ON public.marketing_videos_ideias FOR UPDATE
TO authenticated USING (auth.uid() = criado_por OR public.is_admin());

CREATE POLICY "Autor ou admin pode deletar ideias de videos"
ON public.marketing_videos_ideias FOR DELETE
TO authenticated USING (auth.uid() = criado_por OR public.is_admin());

CREATE TRIGGER update_marketing_videos_ideias_updated_at
BEFORE UPDATE ON public.marketing_videos_ideias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
