ALTER TABLE public.processos_justica ADD COLUMN IF NOT EXISTS ordem integer;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.processos_justica
)
UPDATE public.processos_justica p
SET ordem = ranked.rn
FROM ranked
WHERE p.id = ranked.id AND p.ordem IS NULL;

ALTER TABLE public.processos_justica ALTER COLUMN ordem SET DEFAULT 0;
UPDATE public.processos_justica SET ordem = 0 WHERE ordem IS NULL;
ALTER TABLE public.processos_justica ALTER COLUMN ordem SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_processos_justica_ordem ON public.processos_justica (ordem);