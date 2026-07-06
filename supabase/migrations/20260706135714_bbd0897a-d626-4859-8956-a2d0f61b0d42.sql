CREATE POLICY "vtf public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'visitas-tecnicas-fotos');
CREATE POLICY "vtf auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'visitas-tecnicas-fotos');
CREATE POLICY "vtf auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'visitas-tecnicas-fotos');
CREATE POLICY "vtf auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'visitas-tecnicas-fotos');