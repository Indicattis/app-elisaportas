ALTER TABLE public.requisicoes_compra_itens
  ADD COLUMN IF NOT EXISTS valor_unitario numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ipi_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS codigo_fornecedor text,
  ADD COLUMN IF NOT EXISTS localizacao text;