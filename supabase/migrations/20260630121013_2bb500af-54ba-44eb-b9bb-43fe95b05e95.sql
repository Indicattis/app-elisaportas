ALTER TABLE public.multas ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE public.multas ADD COLUMN IF NOT EXISTS terceiro_nome TEXT;
ALTER TABLE public.multas ADD CONSTRAINT multas_usuario_ou_terceiro_chk CHECK (usuario_id IS NOT NULL OR (terceiro_nome IS NOT NULL AND length(trim(terceiro_nome)) > 0));