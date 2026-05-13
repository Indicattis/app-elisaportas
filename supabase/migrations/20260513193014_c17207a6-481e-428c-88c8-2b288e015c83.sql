-- 1. Adicionar colunas de contrato em vendas
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS contrato_url TEXT,
  ADD COLUMN IF NOT EXISTS contrato_assinado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contrato_anexado_por UUID;

-- 2. Marcar vendas legadas (já com pedido ou já faturadas) como tendo contrato implícito
UPDATE public.vendas v
SET
  contrato_url = COALESCE(v.contrato_url, 'legado'),
  contrato_assinado_em = COALESCE(v.contrato_assinado_em, COALESCE(v.data_venda::timestamptz, v.created_at, now()))
WHERE v.contrato_url IS NULL
  AND (
    EXISTS (SELECT 1 FROM public.pedidos_producao pp WHERE pp.venda_id = v.id)
    OR EXISTS (
      SELECT 1 FROM public.produtos_vendas pv
      WHERE pv.venda_id = v.id AND pv.faturamento = true
    )
  );

-- 3. Criar bucket privado para contratos
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos-vendas', 'contratos-vendas', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Policies do bucket contratos-vendas
DROP POLICY IF EXISTS "Authenticated users can read contratos-vendas" ON storage.objects;
CREATE POLICY "Authenticated users can read contratos-vendas"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contratos-vendas');

DROP POLICY IF EXISTS "Authenticated users can upload contratos-vendas" ON storage.objects;
CREATE POLICY "Authenticated users can upload contratos-vendas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contratos-vendas');

DROP POLICY IF EXISTS "Authenticated users can update contratos-vendas" ON storage.objects;
CREATE POLICY "Authenticated users can update contratos-vendas"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contratos-vendas');

DROP POLICY IF EXISTS "Authenticated users can delete contratos-vendas" ON storage.objects;
CREATE POLICY "Authenticated users can delete contratos-vendas"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contratos-vendas');