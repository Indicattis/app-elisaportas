ALTER TABLE public.produtos_vendas DROP COLUMN IF EXISTS vendas_catalogo_id;
DROP TABLE IF EXISTS public.vendas_catalogo_categorias_ordem;
DROP TABLE IF EXISTS public.vendas_catalogo CASCADE;