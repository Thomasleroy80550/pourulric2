do $outer$
begin
  if exists (select 1 from cron.job where jobname = '8H EUROPE') then
    perform cron.unschedule('8H EUROPE');
  end if;

  if exists (select 1 from cron.job where jobname = 'sync_resend_krossbooking_emails_every_minute') then
    perform cron.unschedule('sync_resend_krossbooking_emails_every_minute');
  end if;

  perform cron.schedule(
    'sync_resend_krossbooking_emails_every_minute',
    '* * * * *',
    $job$select
      net.http_post(
        url:='https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/sync-resend-krossbooking-emails',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer abc123-test-notify'
        ),
        body:=jsonb_build_object(
          'cron_secret', 'abc123-test-notify',
          'limit', 20,
          'inspect_only', false,
          'include_raw', false
        ),
        timeout_milliseconds:=10000
      );$job$
  );
end
$outer$;