DROP POLICY IF EXISTS "guest_report_media_insert" ON storage.objects;
CREATE POLICY "guest_report_media_insert" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'guest_report_media');