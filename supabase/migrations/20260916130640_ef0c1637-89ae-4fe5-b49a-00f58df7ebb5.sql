ALTER TABLE public.representantes
  ADD COLUMN IF NOT EXISTS contrato_url text,
  ADD COLUMN IF NOT EXISTS contrato_nome_arquivo text,
  ADD COLUMN IF NOT EXISTS contrato_tamanho_arquivo integer,
  ADD COLUMN IF NOT EXISTS contrato_uploaded_at timestamp with time zone;