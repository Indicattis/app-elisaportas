ALTER TABLE public.vendas_catalogo
  ADD COLUMN IF NOT EXISTS preco_objetivo numeric,
  ADD COLUMN IF NOT EXISTS custo_ok boolean NOT NULL DEFAULT false;