ALTER TABLE public.tabela_precos_portas ADD COLUMN IF NOT EXISTS ordem integer;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY largura, altura) AS rn
  FROM public.tabela_precos_portas
)
UPDATE public.tabela_precos_portas t
SET ordem = r.rn
FROM ranked r
WHERE t.id = r.id AND t.ordem IS NULL;

CREATE INDEX IF NOT EXISTS idx_tabela_precos_portas_ordem ON public.tabela_precos_portas(ordem);