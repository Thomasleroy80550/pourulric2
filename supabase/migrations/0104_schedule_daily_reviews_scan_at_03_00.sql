select cron.schedule(
  'scan-krossbooking-reviews-daily',
  '0 3 * * *',
  $$
  select net.http_post(
    url:='https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/scan-krossbooking-reviews',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer super-secret-cron-job-key-123456789'),
    body:=jsonb_build_object('cron_secret','super-secret-cron-job-key-123456789'),
    timeout_milliseconds:=5000
  );
  $$
);