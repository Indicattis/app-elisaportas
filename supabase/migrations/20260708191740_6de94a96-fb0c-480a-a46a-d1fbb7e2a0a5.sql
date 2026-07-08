DROP POLICY IF EXISTS "Admins manage dre_realizados" ON public.dre_realizados;
CREATE POLICY "Authenticated view dre_realizados" ON public.dre_realizados FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert dre_realizados" ON public.dre_realizados FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update dre_realizados" ON public.dre_realizados FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins delete dre_realizados" ON public.dre_realizados FOR DELETE USING (is_admin());