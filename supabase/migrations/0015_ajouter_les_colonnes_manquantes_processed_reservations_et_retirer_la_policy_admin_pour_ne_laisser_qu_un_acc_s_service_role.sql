ALTER TABLE public.processed_reservations
  ADD COLUMN IF NOT EXISTS check_in_date date,
  ADD COLUMN IF NOT EXISTS check_out_date date,
  ADD COLUMN IF NOT EXISTS amount numeric;

DROP POLICY IF EXISTS "Admins can manage processed reservations" ON public.processed_reservations;