ALTER TABLE public.marketing_videos_ideias ADD COLUMN IF NOT EXISTS posicao INTEGER;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) - 1 AS rn
  FROM public.marketing_videos_ideias
)
UPDATE public.marketing_videos_ideias m SET posicao = o.rn FROM ordered o WHERE m.id = o.id;

CREATE INDEX IF NOT EXISTS idx_marketing_videos_ideias_posicao ON public.marketing_videos_ideias(posicao);