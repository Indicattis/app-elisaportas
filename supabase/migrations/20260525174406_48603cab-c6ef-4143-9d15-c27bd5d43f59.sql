ALTER TABLE public.marketing_videos_ideias
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'gravar';

ALTER TABLE public.marketing_videos_ideias
  DROP CONSTRAINT IF EXISTS marketing_videos_ideias_status_check;
ALTER TABLE public.marketing_videos_ideias
  ADD CONSTRAINT marketing_videos_ideias_status_check
  CHECK (status IN ('gravar','editar','aprovar','postado','rejeitado'));

CREATE INDEX IF NOT EXISTS idx_marketing_videos_ideias_status ON public.marketing_videos_ideias(status);