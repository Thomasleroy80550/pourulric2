ALTER TABLE public.technical_reports
  ADD COLUMN IF NOT EXISTS guest_rating INTEGER,
  ADD COLUMN IF NOT EXISTS guest_rating_comment TEXT,
  ADD COLUMN IF NOT EXISTS guest_rated_at TIMESTAMP WITH TIME ZONE;