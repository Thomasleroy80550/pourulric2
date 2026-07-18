DROP POLICY IF EXISTS "guest_report_media_read" ON storage.objects;
CREATE POLICY "guest_report_media_read" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'guest_report_media');