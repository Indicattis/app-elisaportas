ALTER TABLE public.tipos_custos
  ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0;

-- Backfill ordem com base no nome, separado por tipo
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tipo ORDER BY nome) AS rn
  FROM public.tipos_custos
)
UPDATE public.tipos_custos t
SET ordem = r.rn
FROM ranked r
WHERE t.id = r.id;

CREATE INDEX IF NOT EXISTS idx_tipos_custos_tipo_ordem
  ON public.tipos_custos (tipo, ordem);
