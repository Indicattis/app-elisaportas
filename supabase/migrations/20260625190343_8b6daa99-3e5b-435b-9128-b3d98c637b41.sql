DROP POLICY IF EXISTS "Only admins can delete contratos" ON public.contratos_vendas;
CREATE POLICY "Authenticated users can delete contratos"
ON public.contratos_vendas
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);