-- 1) Sequence + coluna codigo em fornecedores
CREATE SEQUENCE IF NOT EXISTS public.fornecedores_codigo_seq;

ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS codigo integer;

-- Backfill em ordem de criação
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
  FROM public.fornecedores
  WHERE codigo IS NULL
)
UPDATE public.fornecedores f
SET codigo = o.rn
FROM ordered o
WHERE f.id = o.id;

-- Avança a sequence para o próximo número
SELECT setval(
  'public.fornecedores_codigo_seq',
  COALESCE((SELECT MAX(codigo) FROM public.fornecedores), 0) + 1,
  false
);

ALTER TABLE public.fornecedores
  ALTER COLUMN codigo SET DEFAULT nextval('public.fornecedores_codigo_seq'),
  ALTER COLUMN codigo SET NOT NULL;

ALTER SEQUENCE public.fornecedores_codigo_seq OWNED BY public.fornecedores.codigo;

CREATE UNIQUE INDEX IF NOT EXISTS fornecedores_codigo_unique ON public.fornecedores(codigo);

-- 2) Remover codigo_fornecedor de estoque (não é mais por item)
ALTER TABLE public.estoque DROP COLUMN IF EXISTS codigo_fornecedor;