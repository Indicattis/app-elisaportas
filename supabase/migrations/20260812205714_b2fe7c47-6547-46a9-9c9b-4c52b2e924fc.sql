ALTER TABLE public.multas ADD COLUMN IF NOT EXISTS data_ocorrido date;
UPDATE public.multas SET data_ocorrido = COALESCE(data_ocorrido, data_vencimento, created_at::date);
ALTER TABLE public.multas ALTER COLUMN data_ocorrido SET NOT NULL;
ALTER TABLE public.multas ALTER COLUMN data_ocorrido SET DEFAULT CURRENT_DATE;
ALTER TABLE public.multas ALTER COLUMN data_vencimento DROP NOT NULL;
UPDATE public.multas SET status = CASE WHEN status IN ('paga','concluida','pago') THEN 'pago' ELSE 'pendente' END;
ALTER TABLE public.multas ALTER COLUMN status SET DEFAULT 'pendente';