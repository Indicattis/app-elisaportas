ALTER TABLE public.regras_vendas
  ADD COLUMN IF NOT EXISTS boleto_entrada_percentual_min numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS boleto_valor_limite_flex numeric NOT NULL DEFAULT 60000,
  ADD COLUMN IF NOT EXISTS boleto_intervalos_flex integer[] NOT NULL DEFAULT '{21,36,42}',
  ADD COLUMN IF NOT EXISTS boleto_intervalo_padrao integer NOT NULL DEFAULT 21,
  ADD COLUMN IF NOT EXISTS boleto_parcelas_max integer NOT NULL DEFAULT 3;