CREATE POLICY "medical reports - own files select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'medical-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "medical reports - own files insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'medical-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "medical reports - own files update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'medical-reports' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'medical-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "medical reports - own files delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'medical-reports' AND auth.uid()::text = (storage.foldername(name))[1]);