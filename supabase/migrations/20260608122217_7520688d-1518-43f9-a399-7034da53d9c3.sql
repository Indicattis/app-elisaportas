ALTER TABLE public.caixa_elisa_config
  ADD COLUMN IF NOT EXISTS saldo_conta numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_especie numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_cheque numeric NOT NULL DEFAULT 0;