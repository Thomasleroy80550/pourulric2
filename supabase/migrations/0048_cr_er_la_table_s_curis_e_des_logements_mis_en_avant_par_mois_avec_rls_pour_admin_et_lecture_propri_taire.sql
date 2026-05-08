CREATE TABLE IF NOT EXISTS public.monthly_featured_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_room_id UUID NOT NULL REFERENCES public.user_rooms(id) ON DELETE CASCADE,
  featured_month DATE NOT NULL,
  message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT monthly_featured_rooms_unique_room_month UNIQUE (user_room_id, featured_month),
  CONSTRAINT monthly_featured_rooms_month_start CHECK (featured_month = date_trunc('month', featured_month)::date)
);

ALTER TABLE public.monthly_featured_rooms ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS monthly_featured_rooms_month_idx
  ON public.monthly_featured_rooms (featured_month);

CREATE INDEX IF NOT EXISTS monthly_featured_rooms_user_room_idx
  ON public.monthly_featured_rooms (user_room_id);

DROP POLICY IF EXISTS monthly_featured_rooms_select_policy ON public.monthly_featured_rooms;
CREATE POLICY monthly_featured_rooms_select_policy
ON public.monthly_featured_rooms
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_rooms ur
    WHERE ur.id = monthly_featured_rooms.user_room_id
      AND ur.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS monthly_featured_rooms_insert_policy ON public.monthly_featured_rooms;
CREATE POLICY monthly_featured_rooms_insert_policy
ON public.monthly_featured_rooms
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS monthly_featured_rooms_update_policy ON public.monthly_featured_rooms;
CREATE POLICY monthly_featured_rooms_update_policy
ON public.monthly_featured_rooms
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS monthly_featured_rooms_delete_policy ON public.monthly_featured_rooms;
CREATE POLICY monthly_featured_rooms_delete_policy
ON public.monthly_featured_rooms
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));