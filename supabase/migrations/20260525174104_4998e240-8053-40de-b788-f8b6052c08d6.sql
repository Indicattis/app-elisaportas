ALTER TABLE public.marketing_videos_ideias
  ADD COLUMN IF NOT EXISTS autores_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS autores_nomes TEXT[] NOT NULL DEFAULT '{}';