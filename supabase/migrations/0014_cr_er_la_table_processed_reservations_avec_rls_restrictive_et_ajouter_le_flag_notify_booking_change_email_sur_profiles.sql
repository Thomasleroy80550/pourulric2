CREATE TABLE IF NOT EXISTS public.processed_reservations (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reservation_id text NOT NULL,
  status text NOT NULL,
  check_in_date date,
  check_out_date date,
  amount numeric,
  last_processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reservation_id)
);

ALTER TABLE public.processed_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "processed_reservations_no_select" ON public.processed_reservations;
DROP POLICY IF EXISTS "processed_reservations_no_insert" ON public.processed_reservations;
DROP POLICY IF EXISTS "processed_reservations_no_update" ON public.processed_reservations;
DROP POLICY IF EXISTS "processed_reservations_no_delete" ON public.processed_reservations;

CREATE POLICY "processed_reservations_no_select"
ON public.processed_reservations
FOR SELECT
TO authenticated
USING (false);

CREATE POLICY "processed_reservations_no_insert"
ON public.processed_reservations
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "processed_reservations_no_update"
ON public.processed_reservations
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "processed_reservations_no_delete"
ON public.processed_reservations
FOR DELETE
TO authenticated
USING (false);

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notify_booking_change_email boolean NOT NULL DEFAULT true;