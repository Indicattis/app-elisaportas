-- Atualiza o limite máximo de parcelas do cartão de crédito de 12 para 10
ALTER TABLE public.regras_vendas
ALTER COLUMN cartao_parcelas_max SET DEFAULT 10;

-- Atualiza registros existentes que estejam com 12 para 10
UPDATE public.regras_vendas
SET cartao_parcelas_max = 10
WHERE cartao_parcelas_max = 12;