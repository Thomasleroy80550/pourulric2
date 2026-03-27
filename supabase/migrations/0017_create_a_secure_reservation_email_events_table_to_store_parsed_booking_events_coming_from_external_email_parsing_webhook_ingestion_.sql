CREATE TABLE IF NOT EXISTS public.reservation_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'email',
  event_key TEXT,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ,
  reservation_reference TEXT,
  reservation_id TEXT,
  room_name TEXT NOT NULL,
  room_name_normalized TEXT NOT NULL,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  arrival_date DATE,
  departure_date DATE,
  total_amount NUMERIC,
  guest_count INTEGER,
  reservation_status TEXT,
  subject TEXT,
  before_payload JSONB,
  after_payload JSONB,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  matched_user_room_ids UUID[] NOT NULL DEFAULT '{}',
  matched_user_ids UUID[] NOT NULL DEFAULT '{}',
  processing_status TEXT NOT NULL DEFAULT 'received',
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS reservation_email_events_event_key_unique
ON public.reservation_email_events (event_key)
WHERE event_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS reservation_email_events_reservation_id_idx
ON public.reservation_email_events (reservation_id);

CREATE INDEX IF NOT EXISTS reservation_email_events_room_name_normalized_idx
ON public.reservation_email_events (room_name_normalized);

CREATE INDEX IF NOT EXISTS reservation_email_events_created_at_idx
ON public.reservation_email_events (created_at DESC);

ALTER TABLE public.reservation_email_events ENABLE ROW LEVEL SECURITY;