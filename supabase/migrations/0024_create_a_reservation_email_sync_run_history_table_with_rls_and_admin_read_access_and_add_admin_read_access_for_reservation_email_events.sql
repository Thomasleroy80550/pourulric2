create table if not exists public.reservation_email_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'resend',
  inspect_only boolean not null default false,
  requested_limit integer not null default 20,
  total_fetched integer not null default 0,
  matched_krossbooking integer not null default 0,
  ingested integer not null default 0,
  status text not null default 'started',
  error_message text,
  details jsonb not null default '{}'::jsonb,
  started_at timestamp with time zone not null default now(),
  finished_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

alter table public.reservation_email_sync_runs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reservation_email_sync_runs'
      and policyname = 'reservation_email_sync_runs_admin_read'
  ) then
    create policy reservation_email_sync_runs_admin_read
    on public.reservation_email_sync_runs
    for select
    to authenticated
    using (public.is_admin(auth.uid()));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reservation_email_events'
      and policyname = 'reservation_email_events_admin_read'
  ) then
    create policy reservation_email_events_admin_read
    on public.reservation_email_events
    for select
    to authenticated
    using (public.is_admin(auth.uid()));
  end if;
end $$;