DROP POLICY IF EXISTS "Only admins can delete requisicoes_compra" ON public.requisicoes_compra;
CREATE POLICY "Authenticated users can delete requisicoes_compra"
ON public.requisicoes_compra
FOR DELETE
USING (auth.uid() IS NOT NULL);