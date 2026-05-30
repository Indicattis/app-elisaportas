-- Permitir gastos órfãos (sem tipo_custo_id) quando o tipo de custo é excluído
ALTER TABLE public.gastos ALTER COLUMN tipo_custo_id DROP NOT NULL;

-- Substituir FK por ON DELETE SET NULL
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.gastos'::regclass
      AND contype = 'f'
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.gastos'::regclass AND attname = 'tipo_custo_id')]
  LOOP
    EXECUTE format('ALTER TABLE public.gastos DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.gastos
  ADD CONSTRAINT gastos_tipo_custo_id_fkey
  FOREIGN KEY (tipo_custo_id) REFERENCES public.tipos_custos(id) ON DELETE SET NULL;