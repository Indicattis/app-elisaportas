
ALTER TABLE public.custos_folha_mensais
  ADD COLUMN IF NOT EXISTS pago boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_pagamento date;
