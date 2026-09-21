CREATE TABLE public.visitas_tecnicas_midias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conclusao_id uuid NOT NULL REFERENCES public.visitas_tecnicas_conclusoes(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  tipo text NOT NULL,
  nome_arquivo text NOT NULL,
  tamanho_bytes bigint NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT visitas_tecnicas_midias_tipo_valido CHECK (tipo IN ('imagem', 'video')),
  CONSTRAINT visitas_tecnicas_midias_tamanho_valido CHECK (tamanho_bytes > 0),
  CONSTRAINT visitas_tecnicas_midias_path_unico UNIQUE (storage_path)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitas_tecnicas_midias TO authenticated;
GRANT ALL ON public.visitas_tecnicas_midias TO service_role;

ALTER TABLE public.visitas_tecnicas_midias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vtm_sel" ON public.visitas_tecnicas_midias
FOR SELECT TO authenticated USING (true);
CREATE POLICY "vtm_ins" ON public.visitas_tecnicas_midias
FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vtm_upd" ON public.visitas_tecnicas_midias
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "vtm_del" ON public.visitas_tecnicas_midias
FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_visitas_tecnicas_midias_conclusao
ON public.visitas_tecnicas_midias(conclusao_id, ordem);

CREATE TRIGGER update_visitas_tecnicas_midias_updated_at
BEFORE UPDATE ON public.visitas_tecnicas_midias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "vtm_storage_select" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'visitas-tecnicas-midias');
CREATE POLICY "vtm_storage_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'visitas-tecnicas-midias');
CREATE POLICY "vtm_storage_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'visitas-tecnicas-midias')
WITH CHECK (bucket_id = 'visitas-tecnicas-midias');
CREATE POLICY "vtm_storage_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'visitas-tecnicas-midias');

CREATE OR REPLACE FUNCTION public.validar_midia_final_visita()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conclusao_uuid uuid;
BEGIN
  IF NEW.status = 'concluida' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT id INTO conclusao_uuid
    FROM public.visitas_tecnicas_conclusoes
    WHERE visita_id = NEW.id;

    IF conclusao_uuid IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.visitas_tecnicas_midias
      WHERE conclusao_id = conclusao_uuid
    ) THEN
      RAISE EXCEPTION 'Adicione pelo menos uma mídia final antes de concluir a visita';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validar_midia_final_antes_concluir
BEFORE UPDATE OF status ON public.visitas_tecnicas_agendadas
FOR EACH ROW EXECUTE FUNCTION public.validar_midia_final_visita();