ALTER TABLE public.estoque
  ADD COLUMN IF NOT EXISTS codigo_fornecedor text,
  ADD COLUMN IF NOT EXISTS ipi_percent numeric NOT NULL DEFAULT 0;